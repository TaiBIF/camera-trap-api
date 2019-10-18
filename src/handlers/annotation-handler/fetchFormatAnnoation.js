const { keyBy } = require('lodash');
const mongoose = require('mongoose');
const PageList = require('../../models/page-list');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const DataFieldModel = require('../../models/data/data-field-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
};

const getAnnotationQuery = form => {
  const query = AnnotationModel.where({ state: AnnotationState.active })
    .populate('species')
    .populate('studyArea')
    .populate('file')
    .sort('cameraLocation time filename');

  if (form.cameraLocationIds.length) {
    query.where({
      cameraLocation: { $in: form.cameraLocationIds },
    });
  }

  if (form.startDateTime) {
    query.where({ time: { $gte: form.startDateTime } });
  }

  if (form.endDateTime) {
    query.where({ time: { $lte: form.endDateTime } });
  }

  const otherDataFields = Object.keys(form);
  if (otherDataFields.length) {
    otherDataFields.forEach(dataFieldId => {
      if (!mongoose.Types.ObjectId.isValid(dataFieldId)) {
        return;
      }
      const dataFieldValue = form[dataFieldId];
      query.where({
        fields: {
          $elemMatch: {
            dataField: dataFieldId,
            'value.text': dataFieldValue,
          },
        },
      });
    });
  }

  return query;
};

/**
 * GET /api/v1/annotations
 */
module.exports = async (req, res) => {
  const form = req.query;
  const { cameraLocationIds = [], index = 0 } = form;

  const cameraLocations = await fetchCameraLocations(cameraLocationIds);
  const cameraLocationsMapping = keyBy(cameraLocations, '_id');
  const annotationQuery = getAnnotationQuery(form);
  const annotations = await AnnotationModel.paginate(annotationQuery, {
    offset: (index ? index - 1 : 0) * 500,
    limit: 500,
  });

  const speciesField = await DataFieldModel.findOne({
    systemCode: 'species',
  });

  // 整理 annotations
  const annotationDocs = annotations.docs.map(a => {
    const data = Object.assign({}, a.dump());

    // format camera locations
    const cameraLocationInfo =
      cameraLocationsMapping[data.cameraLocation] || {};
    data.cameraLocation = {
      name: cameraLocationInfo.name || '',
      id: cameraLocationInfo.id || '',
    };

    // format study area
    data.studyArea = {
      id: data.studyArea._id,
      title: data.studyArea.title,
    };

    // format species
    if (a.species === null) {
      const speciesTitle = data.fields.find(
        f => f.dataField.toString() === speciesField._id.toString(),
      );

      data.species = {
        title: {
          'zh-TW': speciesTitle.value ? speciesTitle.value || '' : '',
        },
      };
    }

    return data;
  });

  res.json(
    new PageList(form.index, form.size, annotations.totalDocs, annotationDocs),
  );
};
