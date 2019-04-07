const fs = require('fs');
const config = require('config');
const extract = require('extract-zip');
const tmp = require('tmp');
const utils = require('../common/utils');
const errors = require('../models/errors');
const MediaWorkerData = require('../models/dto/media-worker-data');
const UserModel = require('../models/data/user-model');
const UserPermission = require('../models/const/user-permission');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');
require('../models/data/exchangeable-image-file-model'); // for populate
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');
const UploadSessionErrorType = require('../models/const/upload-session-error-type');
const ProjectModel = require('../models/data/project-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
require('../models/data/study-area-model'); // for populate
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationModel = require('../models/data/annotation-model');

module.exports = (job, done) => {
  const workerData = new MediaWorkerData(job.data);
  let _user;
  let _project;
  let _file;
  let _uploadSession;
  let _cameraLocation;

  if (config.isDebug) {
    console.log(`media-worker job[${job.id}] start.`);
    console.log(JSON.stringify(job.data, null, 2));
  }
  Promise.all([
    UserModel.findById(workerData.userId),
    ProjectModel.findById(workerData.projectId),
    FileModel.findById(workerData.fileId).populate('exif'),
    UploadSessionModel.findById(workerData.uploadSessionId),
    CameraLocationModel.findById(workerData.cameraLocationId).populate(
      'studyArea',
    ),
  ])
    .then(([user, project, file, uploadSession, cameraLocation]) => {
      /*
      - Export user, project, file, upload session, camera location.
      - Do authorization.
      - Do validations.
       */
      _user = user;
      _project = project;
      _file = file;
      _uploadSession = uploadSession;
      _cameraLocation = cameraLocation;

      // Check user, project, file, uploadSession isn't null.
      if (!user) {
        throw new errors.Http400();
      }
      if (!project) {
        throw new errors.Http400();
      }
      if (!file) {
        throw new errors.Http400();
      }
      if (!uploadSession) {
        throw new errors.Http400();
      }
      // Check reference.
      if (
        `${file.project._id}` !== `${project._id}` ||
        `${uploadSession.file._id}` !== `${file._id}`
      ) {
        throw new errors.Http400();
      }
      // Check the user is a member of the project.
      if (
        user.permission !== UserPermission.administrator &&
        !project.members.find(x => `${x.user._id}` === `${user._id}`)
      ) {
        _uploadSession.errorType = UploadSessionErrorType.permissionDenied;
        throw new errors.Http403();
      }
      // Do validations for each the file type.
      switch (file.type) {
        case FileType.annotationImage:
          if (
            !cameraLocation ||
            cameraLocation.state !== CameraLocationState.active
          ) {
            throw new errors.Http404('Camera location is not found.');
          }
          if (
            !cameraLocation.studyArea ||
            cameraLocation.studyArea.state !== StudyAreaState.active
          ) {
            throw new errors.Http404('Study area is not found.');
          }
          break;
        case FileType.annotationZIP:
        default:
      }
    })
    .then(
      /*
      - Unzip the file from S3.
       */
      () =>
        new Promise((resolve, reject) => {
          if (_file.type !== FileType.annotationZIP) {
            return resolve();
          }

          const s3 = utils.getS3();
          const tempFile = tmp.fileSync();
          const tempDir = tmp.dirSync();
          const file = fs.createWriteStream(tempFile.name);

          file.on('close', () => {
            extract(tempFile.name, { dir: tempDir.name }, error => {
              if (error) {
                return reject(error);
              }
              tempFile.removeCallback();
              resolve(tempDir);
            });
          });
          s3.getObject({
            Bucket: config.s3.bucket,
            Key: `${config.s3.folders.annotationZIPs}/${_file.getFilename()}`,
          })
            .createReadStream()
            .on('error', error => {
              tempFile.removeCallback();
              tempDir.removeCallback();
              reject(error);
            })
            .pipe(file);
        }),
    )
    .then(tempDir => {
      /*
      - Upload files to S3.
      @param tempDir {DirSyncObject}
       */
      if (!tempDir) {
        return;
      }

      // todo: upload files at tempDir.name to S3.
      fs.readdirSync(tempDir.name).forEach(file => {
        console.log(typeof file, file); // debug
      });
    })
    .then(() => {
      /*
      - Find the duplicate annotation.
        使用樣區、相機位置、檔名、時間檢查是否已存在 annotation，存在的話需要替換 annotation.file。
       */
      const annotations = [];
      const statements = [];

      switch (_file.type) {
        case FileType.annotationImage:
          annotations.push(
            new AnnotationModel({
              project: _project,
              studyArea: _cameraLocation.studyArea,
              cameraLocation: _cameraLocation,
              file: _file,
              filename: _file.originalFilename,
              time: _file.exif.dateTime,
            }),
          );
          statements.push({
            $and: [
              { cameraLocation: annotations[0].cameraLocation._id },
              { filename: annotations[0].filename },
              { time: annotations[0].time },
            ],
          });
          break;
        case FileType.annotationZIP:
          // todo: Find the duplicate annotations.
          break;
        default:
      }
      return Promise.all([
        annotations,
        AnnotationModel.find({ $or: statements }),
      ]);
    })
    .then(([annotations, duplicateAnnotations]) => {
      const tasks = [];

      annotations.forEach(annotation => {
        const duplicateAnnotation = duplicateAnnotations.find(
          x =>
            `${x.cameraLocation._id}` === `${annotation.cameraLocation._id}` &&
            x.filename === annotation.filename &&
            x.time.getTime() === annotation.time.getTime(),
        );
        if (duplicateAnnotation) {
          // Replace the old file with a new one.
          duplicateAnnotation.file = _file;
          tasks.push(duplicateAnnotation.saveAndAddRevision(_user));
        } else {
          tasks.push(annotation.saveAndAddRevision(_user));
        }
      });
      return Promise.all(tasks);
    })
    .then(() => {
      /*
      Set the upload session as success and save it.
       */
      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.success;
        return _uploadSession.save();
      }
    })
    .then(() => {
      if (config.isDebug) {
        console.log(`media-worker job[${job.id}] done.`);
      }
      done();
    })
    .catch(error => {
      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.failure;
        _uploadSession.errorType =
          _uploadSession.errorType || UploadSessionErrorType.others;
        _uploadSession.save();
      }
      utils.logError(error, job.data);
      done(error);
    });
};
