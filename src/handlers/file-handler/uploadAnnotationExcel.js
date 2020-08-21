const fs = require('fs');
const { keyBy } = require('lodash');
const Promise = require('bluebird');
const moment = require('moment-timezone');
// const detectCharacterEncoding = require('detect-character-encoding');
// const iconv = require('iconv-lite');
const xlsx = require('node-xlsx');
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

/* const fetchExcelFileContent = path =>
  new Promise((resolve, reject) => {
    const { encoding } = detectCharacterEncoding(fs.readFileSync(path));
    // /console.log(iconv.encodingExists("windows-1252")); check if encoding is supported
    let reader;
    if (encoding === 'windows-1252') {
      reader = fs.createReadStream(path).pipe(iconv.decodeStream('win1252'));
      logger.info('decode windows-1252 to utf8');
    } else {
      reader = fs.createReadStream(path);
    }

    reader.on('data', chunk => {
      resolve(chunk.toString());
    });
  }); */

const rawDataToObject = (excelArray, dataFields) => {
  const excelHeaderRow = excelArray[0]; // Define first element as header
  const excelContentRows = excelArray.slice(1); // only retain content without header

  const annotationIndex = excelHeaderRow.findIndex(
    row => row === 'Annotation id',
  ); // check every row has "Annotation id"

  const indexes = {};
  // generate indexes  related to CName
  dataFields.forEach(({ _id, title: { 'zh-TW': CName } }) => {
    const index = excelHeaderRow.findIndex(row => row === CName);
    if (index) {
      indexes[_id] = index;
    }
  });

  // generate a rawData table (subtable is data) extracted the row from content
  const rawData = excelContentRows.map(raw => {
    const data = {
      cameraLocation: raw[2],
      fileName: raw[fileNameIndex], // fileNameIndex=3
      time: raw[4],
      species: raw[5],
      annotationId: raw[annotationIndex], // row with AnnotationId
      origin: raw,
    };

    Object.keys(indexes).forEach(id => {
      data[id] = raw[indexes[id]];
    });
    return data;
  });

  return rawData;
};

module.exports = async (user, file, cameraLocationId, workingRange) => {
  logger.info('Start import excel');
  const type = FileType.annotationExcel;
  console.log(file.path);

  const excelObjectOld = xlsx.parse(fs.readFileSync(file.path)); // Parsing a xlsx from buffer, outputs an array
  // const csvObject = csvParse(await fetchExcelFileContent(file.path), {
  //  bom: true,
  // });

  const excelObject = excelObjectOld[0].data;
  console.log(excelObject);
  const timePattern = /20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]:[0-5][0-9]/;
  excelObject.forEach(
    (
      [studyAreaName, subStudyAreaName, cameraLocationName, filename, time],
      index,
    ) => {
      // check the format of time
      // console.log(!time.match(timePattern));
      if (!time.match(timePattern) && index !== 0) {
        throw new errors.Http400('時間格式錯誤，應為文字，請見教學手冊');
      }
    },
  );

  const cameraLocation = await fetchCameraLocation(cameraLocationId, user); // populate (refer documents in other collections) project and studyArea from CameraLocationModel
  const { project } = cameraLocation; // get the project id from camerLocation

  const filename = file.originalname;

  // generate a fileObject table inherit FileModel(File in Mongo)
  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project,
  });

  // generate a fileObject table inherit UploadSessionModel(UploadSessions in Mongo)
  const uploadSession = new UploadSessionModel({
    state: UploadSessionState.processing,
    project,
    user,
    cameraLocation,
    file: fileObject,
  });

  // ensure saving above tables
  await uploadSession.save();
  await fileObject.saveWithContent(file.path);

  // generate a dataFields table and assign the _id from the project(Projects in Mongo).dataFields
  const dataFields = await DataFieldModel.where({
    _id: { $in: project.dataFields },
  });

  const species = await SpeciesModel.where();

  const excelHeaderRow = excelObject[0];

  const annotationIndex = excelHeaderRow.findIndex(
    row => row === 'Annotation id',
  );

  // run the rawDataToObject function(above) to generate the rawData...
  const excelContentRows = rawDataToObject(excelObject, dataFields);

  if (annotationIndex < 0) {
    const startWorkingDate =
      workingRange !== undefined && workingRange.split(',').length === 2
        ? workingRange.split(',')[0]
        : undefined;
    const endWorkingDate =
      workingRange !== undefined && workingRange.split(',').length === 2
        ? workingRange.split(',')[1]
        : undefined;

    const annotations = excelContentRows.map(data => {
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
        startWorkingDate,
        endWorkingDate,
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
    const excelContentRowsWithAnnotationId = keyBy(
      excelContentRows,
      'annotationId',
    );
    const annotationIds = Object.keys(excelContentRowsWithAnnotationId);
    const annotations = await AnnotationModel.where({
      _id: { $in: annotationIds },
      state: AnnotationState.active,
    });

    try {
      await Promise.resolve(annotations).map(
        annotation => {
          const data = excelContentRowsWithAnnotationId[annotation._id];

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
