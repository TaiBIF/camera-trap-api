const fs = require('fs');
const config = require('config');
const moment = require('moment');
const csvParse = require('csv-parse/lib/sync');
const Promise = require('bluebird');
const utils = require('../../common/utils');
const errors = require('../../models/errors');
const AnnotationModel = require('../../models/data/annotation-model');
const FileModel = require('../../models/data/file-model');
const ProjectModel = require('../../models/data/project-model');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const UploadSessionErrorType = require('../../models/const/upload-session-error-type');
const StudyAreaState = require('../../models/const/study-area-state');
const logger = require('../../logger');
const extractFileByPath = require('./extractFileByPath');
const fetchFileContent = require('./fetchFileContent');
const createFileModels = require('./createFileModels');
const uploadErrors = require('./errors');

const saveAllFileObjectWithCsv = require('./saveAllFileObjectWithCsv');
const saveAllFileObjectWithAnnotationCsv = require('./saveAllFileObjectWithAnnotationCsv');

const saveAnnotationConcurrency = 10;
const csvOptions = {
  bom: true,
};

const fetchZipToTargetFromS3 = (keyname, filename) => {
  const s3 = utils.getS3();
  const file = fs.createWriteStream(filename);

  return new Promise((resolve, reject) => {
    file.on('close', () => {
      resolve(file);
    });

    s3.getObject({
      Bucket: config.s3.bucket,
      Key: `${config.s3.folders.annotationZIPs}/${keyname}`,
    })
      .createReadStream()
      .on('error', error => {
        reject(error);
      })
      .pipe(file);
  });
};

const fetchFiles = filePath =>
  fs.readdirSync(filePath).map(filename => filename);

const saveAllFileObjectWithNewAnnotaions = (
  files,
  project,
  cameraLocation,
  uploadSession,
) =>
  Promise.resolve(files).map(
    file => {
      const annotation = new AnnotationModel({
        project,
        studyArea: cameraLocation.studyArea,
        cameraLocation,
        uploadSession,
        file,
        filename: file.originalFilename,
        time: file.exif.dateTime,
      });
      return annotation.save();
    },
    { concurrency: saveAnnotationConcurrency },
  );

module.exports = async (workerData, uploadSession, user, tempDir, tempFile) => {
  const project = await ProjectModel.findById(workerData.projectId).populate(
    'dataFields',
  );
  if (!project) {
    throw new errors.Http400('no project data');
  }

  if (!project.canAccessBy(user)) {
    uploadSession.errorType = UploadSessionErrorType.permissionDenied;
    throw new errors.Http400('no permission');
  }

  const file = await FileModel.findById(workerData.fileId)
    .where({ project: workerData.projectId })
    .populate('exif');

  if (!file) {
    throw new errors.Http400('no file data');
  }

  const keyname = file.getFilename();

  const cameraLocation = await CameraLocationModel.findById(
    workerData.cameraLocationId,
  )
    .where({ project: workerData.projectId })
    .where({ state: CameraLocationState.active })
    .populate('studyArea');

  if (!cameraLocation) {
    throw new Error(UploadSessionErrorType.imagesAndCsvNotMatch);
  }

  if (
    !cameraLocation.studyArea ||
    cameraLocation.studyArea.state !== StudyAreaState.active
  ) {
    throw new errors.Http404(`Study area is not found`);
  }

  const startFetchZipTime = moment();
  await fetchZipToTargetFromS3(keyname, tempFile.name);
  logger.info(
    `zip worker job. start fetch zip ${moment().to(startFetchZipTime, true)}`,
  );

  const startExtractZipTime = moment();
  await extractFileByPath(tempFile.name, tempDir.name);
  logger.info(
    `zip worker job. extract file ${moment().to(startExtractZipTime, true)}`,
  );

  const filesPath = fetchFiles(tempDir.name);
  const csvFiles = filesPath.filter(elm => elm.match(/.*\.(csv)/i));
  const hasCsvFile = csvFiles.length > 0;

  if (!hasCsvFile) {
    logger.info(`zip worker job. save with Files`);
    const dirname = tempDir.name;
    let files = [];

    try {
      files = await createFileModels(filesPath, dirname, project, user);
    } catch (e) {
      throw new uploadErrors.ConvertFilesFailed(e.message);
    }
    await saveAllFileObjectWithNewAnnotaions(
      files,
      project,
      cameraLocation,
      uploadSession,
    );
    return;
  }

  const csvFilePath = `${tempDir.name}/${csvFiles[0]}`;
  const csvArray = csvParse(await fetchFileContent(csvFilePath), csvOptions);

  if (csvArray.length !== filesPath.length) {
    throw new uploadErrors.InconsistentQuantity(
      `CSV: ${csvArray.length - 1}, media files: ${filesPath - 1}`,
    );
  }

  // check csv content
  const csvHeaderRow = csvArray[0];
  const csvContentArray = csvArray.slice(1);

  // 找出是否有 annotation 欄位
  const withAnntationId =
    csvHeaderRow.filter(row => row === 'Annotation id').length > 0;

  // check csv validate
  const timePattern =
    '/20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/';
  csvContentArray.forEach(
    ([studyAreaName, subStudyAreaName, cameraLocationName, filename, time]) => {
      if (!filesPath.includes(filename)) {
        throw new uploadErrors.ImagesAndCsvNotMatch();
      }

      if (!time.match(timePattern)) {
        throw new uploadErrors.CsvTimeFormatUnValid();
      }
    },
  );

  let fileObjects = [];
  try {
    fileObjects = await createFileModels(
      filesPath,
      tempDir.name,
      project,
      user,
    );
  } catch (e) {
    throw new uploadErrors.ConvertFilesFailed(e.message);
  }

  logger.info(
    `zip worker job. Convert files done: ${Object.keys(fileObjects).length}`,
  );

  if (withAnntationId) {
    await saveAllFileObjectWithAnnotationCsv(
      csvArray,
      fileObjects,
      user,
      project.dataFields,
    );
  } else {
    await saveAllFileObjectWithCsv(
      csvArray,
      fileObjects,
      project,
      user,
      cameraLocation,
    );
  }
};
