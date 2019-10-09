const fs = require('fs');
const { keyBy } = require('lodash');
const csvParse = require('csv-parse/lib/sync');
const Promise = require('bluebird');
const moment = require('moment-timezone');
const detectCharacterEncoding = require('detect-character-encoding');
const iconv = require('iconv-lite');
const errors = require('../../models/errors');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const AnnotationState = require('../../models/const/annotation-state');
const AnnotationModel = require('../../models/data/annotation-model');
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const UploadSessionErrorType = require('../../models/const/upload-session-error-type');
const fetchCameraLocation = require('./fetchCameraLocation');
const DataFieldModel = require('../../models/data/data-field-model');
const SpeciesModel = require('../../models/data/species-model');
const logger = require('../../logger');

const concurrency = 10;
const fileNameIndex = 3;

const fetchCsvFileContent = path =>
  new Promise((resolve, reject) => {
    const { encoding } = detectCharacterEncoding(fs.readFileSync(path));
    let reader;
    if (encoding === 'Big5') {
      reader = fs.createReadStream(path).pipe(iconv.decodeStream('big5'));
      logger.info('decode big 5 to utf8');
    } else {
      reader = fs.createReadStream(path);
    }

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

  return rawData;
};

module.exports = async (user, file, cameraLocationId) => {
  logger.info('Start import csv');
  const type = FileType.annotationCSV;
  const csvObject = csvParse(await fetchCsvFileContent(file.path), {
    bom: true,
  });

  // check csv validate
  const timePattern = /20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]:[0-5][0-9]/;
  csvObject.forEach(
    ([studyAreaName, subStudyAreaName, cameraLocationName, filename, time]) => {
      if (!time.match(timePattern)) {
        throw new errors.Http400('Csv 時間格式錯誤 YYYY-MM-DD HH:mm:ss');
      }
    },
  );

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

  const dataFields = await DataFieldModel.where({
    _id: { $in: project.dataFields },
  });

  const species = await SpeciesModel.where();

  const csvHeaderRow = csvObject[0];

  const annotationIndex = csvHeaderRow.findIndex(
    row => row === 'Annotation id',
  );

  const csvContentRows = rawDataToObject(csvObject, dataFields);

  if (annotationIndex < 0) {
    const annotations = csvContentRows.map(data => {
      // 組 fields
      const fields = dataFields.map(({ _id, options }) => {
        const tempValue = data[_id];
        let value = {};

        if (options.length) {
          const option =
            options.find(
              opt =>
                `${opt._id}` === tempValue || `${opt['zh-TW']}` === tempValue,
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

      return new AnnotationModel({
        project,
        cameraLocation,
        studyArea: cameraLocation.studyArea,
        time: moment.tz(data.time, 'Asia/Taipei').toISOString(),
        filename: data.fileName,
        species: annotationSpecies || null,
        failures: annotationSpecies ? [] : ['new-species'],
        fields,
        rawData: data.origin,
      });
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
    const csvContentRowsWithAnnotationId = keyBy(
      csvContentRows,
      'annotationId',
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
