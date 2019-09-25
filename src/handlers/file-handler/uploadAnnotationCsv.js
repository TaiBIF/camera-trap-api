const fs = require('fs');
const { keyBy } = require('lodash');
const csvParse = require('csv-parse/lib/sync');
const Promise = require('bluebird');
const utils = require('../../common/utils');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const AnnotationState = require('../../models/const/annotation-state');
const AnnotationModel = require('../../models/data/annotation-model');
const ProjectSpeciesModel = require('../../models/data/project-species-model');
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const UploadSessionErrorType = require('../../models/const/upload-session-error-type');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const fetchCameraLocation = require('./fetchCameraLocation');
const DataFieldModel = require('../../models/data/data-field-model');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const SpeciesModel = require('../../models/data/species-model');
const logger = require('../../logger');

const concurrency = 10;
const fileNameIndex = 3;

const fetchFileContent = path =>
  new Promise((resolve, reject) => {
    const reader = fs.createReadStream(path);
    reader.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

const rawDataToObject = (csvArray, dataFields) => {
  const csvHeaderRow = csvArray[0];
  const csvContentRows = csvArray.slice(1);

  const annotationIndex = csvHeaderRow.findIndex(
    row => row === 'Annotation id',
  );

  const indexes = {};

  dataFields.forEach(({ _id, title: { 'zh-TW': CName } }) => {
    const index = csvHeaderRow.findIndex(row => row === CName);
    if (index) {
      indexes[_id] = index;
    }
  });

  const rawData = csvContentRows.map(raw => {
    const data = {
      cameraLocation: raw[2],
      fileName: raw[fileNameIndex],
      time: raw[4],
      species: raw[5],
      annotationId: raw[annotationIndex],
      origin: raw,
    };

    Object.keys(indexes).forEach(id => {
      data[id] = raw[indexes[id]];
    });
    return data;
  });

  return keyBy(rawData, 'annotationId');
};

module.exports = async (user, file, cameraLocationId) => {
  logger.info('start import csv');
  const type = FileType.annotationCSV;
  const csvObject = csvParse(await fetchFileContent(file.path), { bom: true });

  const cameraLocation = await fetchCameraLocation(cameraLocationId, user);
  const { project } = cameraLocation;

  const filename = file.originalname;

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project,
  });
  const uploadSession = new UploadSessionModel({
    state: UploadSessionState.processing,
    project,
    user,
    cameraLocation,
    file: fileObject,
  });

  await uploadSession.save();
  await fileObject.saveWithContent(file.path);

  const projectSpecies = await ProjectSpeciesModel.where({
    project: project._id,
  });

  const dataFields = await DataFieldModel.where({
    _id: { $in: project.dataFields },
  });

  const studyAreas = await StudyAreaModel.where({ project: project._id })
    .where({ state: StudyAreaState.active })
    .find();

  const species = await SpeciesModel.where();
  const cameraLocations = await CameraLocationModel.where({
    project: project._id,
  })
    .where({ state: CameraLocationState.active })
    .find();

  const csvHeaderRow = csvObject[0];

  const annotationIndex = csvHeaderRow.findIndex(
    row => row === 'Annotation id',
  );

  if (!annotationIndex) {
    const { annotations } = utils.convertCsvToAnnotations({
      project: project._id,
      studyAreas,
      dataFields,
      cameraLocations,
      uploadSession,
      projectSpecies,
      species,
      csvObject,
    });

    try {
      await Promise.resolve(annotations).map(
        annotation => {
          annotation.state = AnnotationState.active;
          annotation.save();
          return annotation;
        },
        {
          concurrency,
        },
      );
      logger.info(`Total save: ${annotations.length}`);
      uploadSession.state = UploadSessionState.success;
    } catch (e) {
      uploadSession.errorType = UploadSessionErrorType.others;
      uploadSession.errorMessage = e.message;
      uploadSession.state = UploadSessionState.failure;
    }
  } else {
    const csvContentRowsWithAnnotationId = rawDataToObject(
      csvObject,
      dataFields,
    );
    const annotationIds = Object.keys(csvContentRowsWithAnnotationId);
    const annotations = await AnnotationModel.where({
      _id: { $in: annotationIds },
      state: AnnotationState.active,
    });

    try {
      await Promise.resolve(annotations).map(
        annotation => {
          const data = csvContentRowsWithAnnotationId[annotation._id];

          // 組 fields
          const fields = dataFields.map(({ _id, options }) => {
            const tempValue = data[_id];
            let value = {};

            if (options.length) {
              const option =
                options.find(
                  opt =>
                    `${opt._id}` === tempValue ||
                    `${opt['zh-TW']}` === tempValue,
                ) || {};

              value = {
                selectId: option._id,
                text: option._id || tempValue,
                selectLabel: option['zh-TW'],
              };
            } else {
              value = {
                text: tempValue,
              };
            }

            return {
              dataField: _id,
              value,
            };
          });

          const annotationSpecies = species.find(
            x => x.title['zh-TW'] === data.species,
          );

          annotation.filename = data.fileName;
          annotation.species = annotationSpecies || null;
          annotation.failures =
            annotation.species === null ? ['new-species'] : [];
          annotation.fields = fields;
          annotation.rawData = data.origin;
          annotation.saveAndAddRevision(user);
          return annotation;
        },
        {
          concurrency,
        },
      );
      uploadSession.state = UploadSessionState.success;
    } catch (e) {
      uploadSession.errorType = UploadSessionErrorType.others;
      uploadSession.errorMessage = e.message;
      uploadSession.state = UploadSessionState.failure;
    }
    logger.info(`Total update: ${annotations.length}`);
  }

  // update status
  await uploadSession.save();

  fs.unlinkSync(file.path);
  return { ...fileObject.dump(), uploadSession: uploadSession._id };
};
