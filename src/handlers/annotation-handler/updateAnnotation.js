const { keyBy } = require('lodash');
const errors = require('../../models/errors');
const ProjectModel = require('../../models/data/project-model');
const SpeciesModel = require('../../models/data/species-model');
const AnnotationForm = require('../../forms/annotation/annotation-form');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');

const newSpecies = 'new-species';

const updateDataFields = (projectFields, formDataFields, originDataFields) => {
  const formFields = keyBy(formDataFields, 'dataField');
  const originFields = keyBy(originDataFields, 'dataField');

  const fields = projectFields
    .map(({ _id, options }) => {
      const formData = formFields[_id] || {};
      const originField = originFields[_id] || { value: { text: '' } };

      if (!formFields[_id] && !originFields[_id]) {
        return;
      }

      let value = {};

      // 若為選項的話
      if (options.length) {
        const option =
          options.find(opt => `${opt._id}` === formData.value) || {};

        value = {
          selectId: option._id,
          text: option._id || formData.value || originField.value.text,
          selectLabel: option['zh-TW'],
        };
      } else {
        value = {
          text: formData ? formData.value : originField.value.text,
        };
      }

      return {
        dataField: _id,
        value,
      };
    })
    .filter(f => !!f);
  return fields;
};

/*
 * PUT /api/v1/annotations/:annotationId
 */
module.exports = async (req, res) => {
  const form = new AnnotationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const annotation = await AnnotationModel.findById(req.params.annotationId)
    .where({ state: AnnotationState.active })
    .populate('file');
  const species =
    (await SpeciesModel.where({
      'title.zh-TW': form.speciesTitle,
    }).findOne()) || null;

  if (!annotation) {
    throw new errors.Http404();
  }

  const project = await ProjectModel.findById(annotation.project._id).populate(
    'dataFields',
  );

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403();
  }

  // handle fields
  const fields = updateDataFields(
    project.dataFields,
    form.fields,
    annotation.fields,
  );
  annotation.fields = fields;

  // handle Species
  annotation.species = species;
  if (!species) {
    const speciesField = project.dataFields.find(
      d => d.systemCode === 'species',
    );

    annotation.failures = [newSpecies];
    annotation.fields = fields.filter(
      f => f.dataField.toString() !== speciesField._id.toString(),
    );

    annotation.fields.push({
      dataField: speciesField._id,
      value: { text: form.speciesTitle },
    });
  } else {
    annotation.failures = [];
  }

  // annotation.fields = [];

  if (req.body.tags) {
    annotation.tags = req.body.tags;
  }

  await annotation.save();

  const projectFieldsObject = keyBy(project.dataFields, '_id');

  const result = annotation.dump();
  result.fields = fields.map(({ dataField, value }) => ({
    dataField: {
      id: projectFieldsObject[dataField].id,
      widgetType: projectFieldsObject[dataField].widgetType,
    },
    value: value.text || '',
  }));

  result.species = {
    title: { id: '', 'zh-TW': form.speciesTitle },
  };

  res.json(result);
};
