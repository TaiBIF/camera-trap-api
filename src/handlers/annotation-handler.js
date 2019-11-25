const auth = require('../auth/authorization');
const errors = require('../models/errors');
const utils = require('../common/utils');
const UserPermission = require('../models/const/user-permission');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const DataFieldModel = require('../models/data/data-field-model');
const ProjectSpeciesModel = require('../models/data/project-species-model');
const SpeciesModel = require('../models/data/species-model');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationForm = require('../forms/annotation/annotation-form');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');
const getAnnotation = require('./annotation-handler/getAnnotations');
const updateAnnotation = require('./annotation-handler/updateAnnotation');
const fetchFormatAnnotations = require('./annotation-handler/fetchFormatAnnoation');

exports.getAnnotations = auth(UserPermission.all(), getAnnotation);
exports.fetchFormatAnnotations = auth(
  UserPermission.all(),
  fetchFormatAnnotations,
);

exports.updateAnnotation = auth(UserPermission.all(), updateAnnotation);

exports.addAnnotation = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/annotations
   */
  const form = new AnnotationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  if (!form.cameraLocation) {
    throw new errors.Http400('The camera location is required.');
  }
  if (!form.filename) {
    throw new errors.Http400('The filename is required.');
  }
  if (!form.time) {
    throw new errors.Http400('The time is required.');
  }

  return Promise.all([
    CameraLocationModel.findById(form.cameraLocation)
      .where({ state: CameraLocationState.active })
      .populate('project')
      .populate('studyArea'),
    SpeciesModel.where({ 'title.zh-TW': form.speciesTitle }).findOne(),
    FileModel.findById(form.file).where({
      type: { $in: [FileType.annotationImage, FileType.annotationVideo] },
    }),
  ])
    .then(([cameraLocation, species, file]) => {
      if (!cameraLocation) {
        throw new errors.Http400('Not found the camera location.');
      }
      if (cameraLocation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http400(
          `The study area of the camera location isn't active.`,
        );
      }
      if (!cameraLocation.project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (form.file) {
        if (!file) {
          throw new errors.Http400('Not found the file.');
        }
        if (`${file.project._id}` !== `${cameraLocation.project._id}`) {
          throw new errors.Http400(
            'The project of the file and the project of the camera location are different.',
          );
        }
      }

      return Promise.all([
        cameraLocation.project,
        cameraLocation,
        species,
        species
          ? ProjectSpeciesModel.where({
              project: cameraLocation.project._id,
              species: species._id,
            }).findOne()
          : null,
        ProjectSpeciesModel.where({
          project: cameraLocation.project._id,
        }).countDocuments(),
        file,
        DataFieldModel.populate(cameraLocation.project, 'dataFields'),
      ]);
    })
    .then(
      ([
        project,
        cameraLocation,
        species,
        projectSpecies,
        projectSpeciesQuantity,
        file,
      ]) => {
        // Validate form.fields.
        const projectDataFields = {}; // { "dataFieldId": DataField }
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

        let tasks = [];
        let isAddedNewProjectSpecies = false;
        if (form.speciesTitle) {
          if (!species) {
            // The species isn't in the system.
            species = new SpeciesModel({
              title: {
                'zh-TW': form.speciesTitle,
              },
            });
            projectSpecies = new ProjectSpeciesModel({
              project,
              species,
              index: projectSpeciesQuantity,
            });
            tasks = [project, species.save(), projectSpecies.save()];
            isAddedNewProjectSpecies = true;
          } else if (!projectSpecies) {
            // The species is already in the system, but not in the project.
            projectSpecies = new ProjectSpeciesModel({
              project,
              species,
              index: projectSpeciesQuantity,
            });
            tasks = [project, species, projectSpecies.save()];
            isAddedNewProjectSpecies = true;
          }
        }

        const annotation = new AnnotationModel({
          project,
          studyArea: cameraLocation.studyArea,
          cameraLocation,
          state: AnnotationState.active,
          filename: form.filename,
          file: file || undefined,
          time: form.time,
          species: species || undefined,
          fields: utils.convertAnnotationFields(form.fields, projectDataFields),
        });
        tasks.unshift(isAddedNewProjectSpecies);
        tasks.unshift(annotation.saveAndAddRevision(req.user));
        return Promise.all(tasks);
      },
    )
    .then(([annotation, isAddedNewProjectSpecies, project, species]) => {
      if (isAddedNewProjectSpecies) {
        utils.removeNewSpeciesFailureFlag(project, species).catch(error => {
          utils.logError(error, { project, species, annotation });
        });
      }
      res.json(annotation.dump());
    });
});

exports.getAnnotation = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/annotations/:annotationId
   */
  AnnotationModel.findById(req.params.annotationId)
    .where({ state: AnnotationState.active })
    .populate('project')
    .populate('studyArea')
    .populate('cameraLocation')
    .populate('file')
    .populate('species')
    .populate('fields.dataField')
    .then(annotation => {
      if (!annotation) {
        throw new errors.Http404();
      }
      if (annotation.cameraLocation.state !== CameraLocationState.active) {
        throw new errors.Http404();
      }
      if (annotation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http404();
      }
      if (!annotation.project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      res.json(annotation.dump());
    }),
);

exports.deleteAnnotation = auth(UserPermission.all(), (req, res) =>
  /*
  DELETE /api/v1/annotations/:annotationId
   */
  AnnotationModel.findById(req.params.annotationId)
    .where({ state: AnnotationState.active })
    .populate('project')
    .then(annotation => {
      if (!annotation) {
        throw new errors.Http404('Not found the annotation.');
      }
      if (!annotation.project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      annotation.state = AnnotationState.removed;
      return annotation.save();
    })
    .then(() => {
      res.status(204).send();
    }),
);
