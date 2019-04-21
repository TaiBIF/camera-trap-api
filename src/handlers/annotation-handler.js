const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const DataFieldWidgetType = require('../models/const/data-field-widget-type');
const ProjectModel = require('../models/data/project-model');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const SpeciesModel = require('../models/data/species-model');
const AnnotationsSearchForm = require('../forms/annotation/annotations-search-form');
const AnnotationForm = require('../forms/annotation/annotation-form');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const AnnotationFailureType = require('../models/const/annotation-failure-type');

exports.getAnnotations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/annotations
   */
  const form = new AnnotationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  if (!form.studyArea && !form.cameraLocations.length) {
    throw new errors.Http400(
      'studyArea and cameraLocations least one should be not empty.',
    );
  }

  let tasks;
  if (form.studyArea) {
    tasks = [
      StudyAreaModel.findById(form.studyArea)
        .where({ state: StudyAreaState.active })
        .populate('project'),
      StudyAreaModel.where({ parent: form.studyArea }).where({
        state: StudyAreaState.active,
      }),
      CameraLocationModel.where({ _id: { $in: form.cameraLocations } })
        .where({ state: CameraLocationState.active })
        .populate('project'),
    ];
  } else {
    // cameraLocations
    tasks = [
      null,
      null,
      CameraLocationModel.where({ _id: { $in: form.cameraLocations } })
        .where({ state: CameraLocationState.active })
        .populate('project'),
    ];
  }
  return Promise.all(tasks)
    .then(([studyArea, childStudyAreas, cameraLocations]) => {
      if (form.studyArea) {
        if (!studyArea) {
          throw new errors.Http404();
        }
        if (
          req.user.permission !== UserPermission.administrator &&
          !studyArea.project.members.find(
            x => `${x.user._id}` === `${req.user._id}`,
          )
        ) {
          throw new errors.Http403();
        }
      }
      if (form.cameraLocations && form.cameraLocations.length) {
        if (form.cameraLocations.length !== cameraLocations.length) {
          throw new errors.Http404();
        }
        cameraLocations.forEach(cameraLocation => {
          if (
            req.user.permission !== UserPermission.administrator &&
            !cameraLocation.project.members.find(
              x => `${x.user._id}` === `${req.user._id}`,
            )
          ) {
            throw new errors.Http403();
          }
        });
      }

      const query = AnnotationModel.where({ state: AnnotationState.active })
        .populate('file')
        .populate('species')
        .sort(form.sort);
      if (form.startTime) {
        query.where({ time: { $gte: form.startTime } });
      }
      if (form.endTime) {
        query.where({ time: { $lte: form.startTime } });
      }
      if (studyArea) {
        const studyAreaIds = [`${studyArea._id}`];
        childStudyAreas.forEach(childStudyArea => {
          studyAreaIds.push(`${childStudyArea._id}`);
        });
        query.where({ studyArea: { $in: studyAreaIds } });
      }
      if (cameraLocations.length) {
        query.where({
          cameraLocation: { $in: cameraLocations.map(x => x._id) },
        });
      }
      return AnnotationModel.paginate(query, {
        offset: form.index * form.size,
        limit: form.size,
      });
    })
    .then(result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});

exports.updateAnnotation = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/annotations/:annotationId
   */
  const form = new AnnotationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    AnnotationModel.findById(req.params.annotationId).where({
      state: AnnotationState.active,
    }),
    SpeciesModel.findById(form.species),
  ])
    .then(([annotation, species]) =>
      Promise.all([
        ProjectModel.findById(annotation.project).populate('dataFields'),
        annotation,
        species,
      ]),
    )
    .then(([project, annotation, species]) => {
      if (!annotation) {
        throw new errors.Http404();
      }
      if (
        req.user.permission !== UserPermission.administrator &&
        !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
      ) {
        throw new errors.Http403();
      }
      if (form.species) {
        if (!species) {
          throw new errors.Http404();
        }
        if (`${species.project._id}` !== `${project._id}`) {
          throw new errors.Http400(
            'The project of species and the project of the annotation are different.',
          );
        }
      }
      const projectDataFields = {};
      const formFieldIds = new Set();
      project.dataFields.forEach(dataField => {
        projectDataFields[`${dataField._id}`] = dataField;
      });
      (form.fields || []).forEach(field => {
        if (!(field.dataField in projectDataFields)) {
          throw new errors.Http400(
            `Data field ${field.dataField} not in the project.`,
          );
        }
        if (formFieldIds.has(field.dataField)) {
          throw new errors.Http400(`${field.dataField} is duplicate.`);
        }
        formFieldIds.add(field.dataField);
      });

      // Remove newSpecies failure flag.
      const newSpeciesIndex = annotation.failures.indexOf(
        AnnotationFailureType.newSpecies,
      );
      if (newSpeciesIndex >= 0) {
        annotation.failures.splice(newSpeciesIndex, 1);
      }
      // Assign species.
      annotation.species = species;
      // Assign fields.
      annotation.fields = (form.fields || []).map(field => {
        const value = {};
        switch (projectDataFields[field.dataField].widgetType) {
          case DataFieldWidgetType.time:
            value.time = field.value;
            break;
          case DataFieldWidgetType.select:
            if (
              !projectDataFields[field.dataField].options.find(
                x => `${x._id}` === field.value,
              )
            ) {
              throw new errors.Http400(
                `${field.value} not in ${JSON.stringify(
                  projectDataFields[field.dataField].options,
                )}.`,
              );
            }
            value.selectId = field.value;
            break;
          case DataFieldWidgetType.text:
          default:
            value.text = field.value;
            break;
        }
        return {
          dataField: projectDataFields[field.dataField],
          value,
        };
      });
      return annotation.saveAndAddRevision(req.user);
    })
    .then(annotation => {
      res.json(annotation.dump());
    });
});
