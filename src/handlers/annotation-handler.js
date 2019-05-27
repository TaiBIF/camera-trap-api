const config = require('config');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const utils = require('../common/utils');
const UserPermission = require('../models/const/user-permission');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldWidgetType = require('../models/const/data-field-widget-type');
const DataFieldSystemCode = require('../models/const/data-field-system-code');
const DataFieldState = require('../models/const/data-field-state');
const ProjectModel = require('../models/data/project-model');
const ProjectSpeciesModel = require('../models/data/project-species-model');
const SpeciesModel = require('../models/data/species-model');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationsSearchForm = require('../forms/annotation/annotations-search-form');
const AnnotationForm = require('../forms/annotation/annotation-form');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const AnnotationFailureType = require('../models/const/annotation-failure-type');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');

exports.getAnnotations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/annotations
  GET /api/v1/annotations.csv
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
  if (form.timeRangeStart != null && form.timeRangeEnd == null) {
    throw new errors.Http400('timeRangeEnd is required.');
  }
  if (form.timeRangeEnd != null && form.timeRangeStart == null) {
    throw new errors.Http400('timeRangeStart is required.');
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
  tasks.push(
    DataFieldModel.where({
      _id: { $in: Object.keys(form.fields) },
      state: DataFieldState.approved,
    }),
  );
  return Promise.all(tasks).then(
    ([studyArea, childStudyAreas, cameraLocations, dataFields]) => {
      if (form.studyArea) {
        if (!studyArea) {
          throw new errors.Http404();
        }
        if (!studyArea.project.canAccessBy(req.user)) {
          throw new errors.Http403();
        }
      }
      if (form.cameraLocations && form.cameraLocations.length) {
        if (form.cameraLocations.length !== cameraLocations.length) {
          throw new errors.Http404();
        }
        cameraLocations.forEach(cameraLocation => {
          if (!cameraLocation.project.canAccessBy(req.user)) {
            throw new errors.Http403();
          }
        });
      }
      if (Object.keys(form.fields).length !== dataFields.length) {
        throw new errors.Http400('Some data fields are not found.');
      }

      const query = AnnotationModel.where({ state: AnnotationState.active })
        .populate('species')
        .sort(form.sort);
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
      if (form.uploadSession) {
        query.where({ uploadSession: form.uploadSession });
      }
      if (form.startTime) {
        query.where({ time: { $gte: form.startTime } });
      }
      if (form.endTime) {
        query.where({ time: { $lte: form.endTime } });
      }
      if (form.species.length) {
        query.where({ species: { $in: form.species } });
      }
      if (form.timeRangeStart != null) {
        const dayInMilliseconds = 24 * 60 * 60 * 1000;
        const duration = form.timeRangeEnd - form.timeRangeStart;
        let { timeRangeStart } = form;
        if (form.timeRangeStart < 0) {
          // The time is offset to the previous day.
          timeRangeStart += dayInMilliseconds;
        } else if (form.timeRangeStart >= dayInMilliseconds) {
          // The time is offset to the next day.
          timeRangeStart -= dayInMilliseconds;
        }

        if (timeRangeStart + duration >= dayInMilliseconds) {
          query.where({
            $or: [
              {
                totalMilliseconds: {
                  $gte: timeRangeStart,
                },
              },
              {
                totalMilliseconds: {
                  $lte: timeRangeStart + duration - dayInMilliseconds,
                },
              },
            ],
          });
        } else {
          query.where({
            $and: [
              {
                totalMilliseconds: {
                  $gte: timeRangeStart,
                },
              },
              {
                totalMilliseconds: {
                  $lte: timeRangeStart + duration,
                },
              },
            ],
          });
        }
      }

      // 進階篩選 DataField
      dataFields.forEach(dataField => {
        let date;
        switch (dataField.widgetType) {
          case DataFieldWidgetType.time:
            date = new Date(form.fields[`${dataField._id}`]);
            if (Number.isNaN(date.getTime())) {
              throw new errors.Http400(
                `The value "${form.fields[`${dataField._id}`]}" of field ${
                  dataField._id
                } should be a date.`,
              );
            }
            query.where({
              fields: {
                $elemMatch: {
                  dataField: dataField._id,
                  'value.time': new Date(form.fields[`${dataField._id}`]),
                },
              },
            });
            break;
          case DataFieldWidgetType.select:
            if (
              !dataField.options.find(
                x => `${x._id}` === form.fields[`${dataField._id}`],
              )
            ) {
              throw new errors.Http400(
                `The option ${
                  form.fields[`${dataField._id}`]
                } not in the field ${dataField._id}.`,
              );
            }
            query.where({
              fields: {
                $elemMatch: {
                  dataField: dataField._id,
                  'value.selectId': form.fields[`${dataField._id}`],
                },
              },
            });
            break;
          case DataFieldWidgetType.text:
          default:
            query.where({
              fields: {
                $elemMatch: {
                  dataField: dataField._id,
                  'value.text': form.fields[`${dataField._id}`],
                },
              },
            });
        }
      });

      if (!/\.csv$/i.test(req.path)) {
        // return json
        query.populate('file');
        return AnnotationModel.paginate(query, {
          offset: form.index * form.size,
          limit: form.size,
        }).then(result => {
          res.json(
            new PageList(form.index, form.size, result.totalDocs, result.docs),
          );
        });
      }

      // download csv
      let writePromise;
      return Promise.all([
        DataFieldModel.populate(cameraLocations, 'project.dataFields'),
        StudyAreaModel.populate(cameraLocations, 'studyArea'),
      ])
        .then(() =>
          /*
          - Populate cameraLocations.studyArea.parent.
           */
          StudyAreaModel.populate(cameraLocations, 'studyArea.parent'),
        )
        .then(() => {
          // 樣區, 子樣區, 相機位置, 檔名, 日期時間, 物種, ...
          let systemRowQuantity = 0;
          const headRow = [];
          const customDataFieldIds = [];
          // For system default fields.
          for (
            let index = 0;
            index < cameraLocations[0].project.dataFields.length;
            index += 1
          ) {
            const dataField = cameraLocations[0].project.dataFields[index];
            if (!dataField.systemCode) {
              break;
            }
            headRow.push(dataField.title['zh-TW']);
            systemRowQuantity += 1;
            if (dataField.systemCode === DataFieldSystemCode.studyArea) {
              headRow.push('子樣區');
              systemRowQuantity += 1;
            }
          }

          // For custom data fields
          cameraLocations.forEach(cameraLocation => {
            cameraLocation.project.dataFields.forEach(dataField => {
              if (dataField.systemCode) {
                return;
              }
              if (customDataFieldIds.indexOf(`${dataField._id}`) >= 0) {
                return;
              }
              customDataFieldIds.push(`${dataField._id}`);
              headRow.push(dataField.title['zh-TW']);
            });
          });

          const writeHeadRow = () =>
            /*
            Write head row data to the response stream.
            @returns {Promise<>}
             */
            utils.csvStringifyAsync([headRow]).then(data => {
              res.setHeader(
                'Content-disposition',
                'attachment; filename=export.csv',
              );
              res.contentType('csv');
              res.write(data);
            });
          return new Promise((resolve, reject) => {
            query
              .cursor()
              .on('error', error => {
                reject(error);
              })
              .on('close', () => {
                if (writePromise) {
                  writePromise.then(() => {
                    res.end();
                    resolve();
                  });
                } else {
                  writeHeadRow().then(() => {
                    res.end();
                    resolve();
                  });
                }
              })
              .on('data', annotation => {
                const cameraLocation = cameraLocations.find(
                  x => `${x._id}` === `${annotation.cameraLocation._id}`,
                );
                const row = new Array(
                  systemRowQuantity + customDataFieldIds.length,
                );
                cameraLocation.project.dataFields.forEach(dataField => {
                  let annotationField;
                  switch (dataField.systemCode) {
                    case DataFieldSystemCode.studyArea:
                      if (cameraLocation.studyArea.parent) {
                        row[0] = cameraLocation.studyArea.parent.title['zh-TW'];
                        row[1] = cameraLocation.studyArea.title['zh-TW'];
                      } else {
                        row[0] = cameraLocation.studyArea.title['zh-TW'];
                        row[1] = '';
                      }
                      break;
                    case DataFieldSystemCode.cameraLocation:
                      row[2] = cameraLocation.name;
                      break;
                    case DataFieldSystemCode.fileName:
                      row[3] = annotation.filename;
                      break;
                    case DataFieldSystemCode.time:
                      row[4] = utils.stringifyTimeToCSV(
                        annotation.time,
                        config.defaultTimezone,
                      );
                      break;
                    case DataFieldSystemCode.species:
                      row[5] = annotation.species
                        ? annotation.species.title['zh-TW']
                        : '';
                      break;
                    default:
                      // custom fields
                      annotationField = annotation.fields.find(
                        x => `${x.dataField._id}` === `${dataField._id}`,
                      );
                      if (!annotationField) {
                        return;
                      }

                      switch (dataField.widgetType) {
                        case DataFieldWidgetType.select:
                          if (annotationField.value.selectId) {
                            row[
                              systemRowQuantity +
                                customDataFieldIds.indexOf(
                                  `${annotationField.dataField._id}`,
                                )
                            ] = dataField.options.find(
                              x =>
                                `${x._id}` ===
                                `${annotationField.value.selectId}`,
                            )['zh-TW'];
                          } else {
                            row[
                              systemRowQuantity +
                                customDataFieldIds.indexOf(
                                  `${annotationField.dataField._id}`,
                                )
                            ] = '';
                          }
                          break;
                        case DataFieldWidgetType.time:
                          row[
                            systemRowQuantity +
                              customDataFieldIds.indexOf(
                                `${annotationField.dataField._id}`,
                              )
                          ] = annotationField.value.time
                            ? utils.stringifyTimeToCSV(
                                annotationField.value.time,
                                config.defaultTimezone,
                              )
                            : '';
                          break;
                        case DataFieldWidgetType.text:
                        default:
                          row[
                            systemRowQuantity +
                              customDataFieldIds.indexOf(
                                `${annotationField.dataField._id}`,
                              )
                          ] = annotationField.value.text
                            ? annotationField.value.text
                            : '';
                      }
                  }
                });

                if (writePromise) {
                  writePromise = writePromise
                    .then(() => utils.csvStringifyAsync([row]))
                    .then(data => {
                      res.write(data);
                    });
                } else {
                  writePromise = writeHeadRow()
                    .then(() => utils.csvStringifyAsync([row]))
                    .then(data => {
                      res.write(data);
                    });
                }
              });
          });
        });
    },
  );
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
    AnnotationModel.findById(req.params.annotationId)
      .where({ state: AnnotationState.active })
      .populate('file'),
    form.speciesTitle
      ? SpeciesModel.where({ 'title.zh-TW': form.speciesTitle }).findOne()
      : null,
  ])
    .then(([annotation, species]) => {
      if (!annotation) {
        throw new errors.Http404();
      }

      return Promise.all([
        ProjectModel.findById(annotation.project._id).populate('dataFields'),
        annotation,
        species,
        species
          ? ProjectSpeciesModel.where({
              project: annotation.project._id,
              species: species._id,
            }).findOne()
          : null,
        ProjectSpeciesModel.where({
          project: annotation.project._id,
        }).countDocuments(),
      ]);
    })
    .then(
      ([
        project,
        annotation,
        species,
        projectSpecies,
        projectSpeciesQuantity,
      ]) => {
        if (!project.canAccessBy(req.user)) {
          throw new errors.Http403();
        }

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

        // Remove newSpecies failure flag.
        const newSpeciesIndex = annotation.failures.indexOf(
          AnnotationFailureType.newSpecies,
        );
        if (newSpeciesIndex >= 0) {
          annotation.failures.splice(newSpeciesIndex, 1);
        }
        // Assign species.
        annotation.species = species || undefined;
        // Assign fields.
        annotation.fields = utils.convertAnnotationFields(
          form.fields,
          projectDataFields,
        );
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
