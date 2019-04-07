const fs = require('fs');
const util = require('util');
const config = require('config');
const multer = require('multer');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const utils = require('../common/utils');
const UserPermission = require('../models/const/user-permission');
const FileType = require('../models/const/file-type');
const FileForm = require('../forms/file/file-form');
const FileModel = require('../models/data/file-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const StudyAreaState = require('../models/const/study-area-state');
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');
const UploadSessionErrorType = require('../models/const/upload-session-error-type');
const MediaWorkerData = require('../models/dto/media-worker-data');
const TaskWorker = require('../models/const/task-worker');

const imageMulter = util.promisify(
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.limit.imageFileSize,
    },
  }).single('file'),
);
const zipMulter = util.promisify(
  multer({
    storage: multer.diskStorage({}),
    limits: {
      fileSize: config.limit.zipFileSize,
    },
  }).single('file'),
);

exports.uploadFile = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/files?type&projectId
  Content-Type: multipart/form-data
  The input name is "file" of the form.
   */
  const form = new FileForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  switch (form.type) {
    case FileType.annotationImage:
    case FileType.annotationZIP:
    case FileType.annotationCSV:
      if (!form.cameraLocation) {
        throw new errors.Http400('The cameraLocation is required.');
      }
      break;
    default:
  }

  let _uploadSession;
  const multerTable = {};
  multerTable[FileType.projectCoverImage] = imageMulter;
  multerTable[FileType.annotationImage] = imageMulter;
  multerTable[FileType.annotationZIP] = zipMulter;
  return multerTable[form.type](req, res)
    .then(() => {
      /*
      - Check the extension name of the uploaded file.
      - Create a file.
      @returns {Promise<[{FileModel}, {CameraLocationModel|null}]>}
       */
      if (!req.file) {
        throw new errors.Http400('Missing the file.');
      }

      const file = new FileModel({
        type: form.type,
        user: req.user,
        originalFilename: req.file.originalname,
      });
      switch (form.type) {
        case FileType.projectCoverImage:
        case FileType.annotationImage:
          if (['jpg', 'png'].indexOf(file.getExtensionName()) < 0) {
            throw new errors.Http400('Just allow jpg and png files.');
          }
          break;
        case FileType.annotationZIP:
          if (file.getExtensionName() !== 'zip') {
            throw new errors.Http400('Just allow zip files.');
          }
          break;
        case FileType.annotationCSV:
          if (file.getExtensionName() !== 'csv') {
            throw new errors.Http400('Just allow csv files.');
          }
          break;
        default:
      }

      switch (form.type) {
        case FileType.annotationImage:
        case FileType.annotationZIP:
        case FileType.annotationCSV:
          return Promise.all([
            file,
            CameraLocationModel.findById(form.cameraLocation)
              .populate('project')
              .populate('studyArea'),
          ]);
        default:
          return Promise.all([file]);
      }
    })
    .then(([file, cameraLocation]) => {
      /*
      - Check authorization of the project, study area, camera location.
      - Append a field `project` of the file.
      - Save a file (upload to s3).
      @param file {FileModel} This file didn't save. We should check the permission.
      @param cameraLocation {CameraLocationModel|null}
      @returns {Promise<[{FileModel}]>}
       */
      // Authorization
      switch (form.type) {
        case FileType.annotationImage:
        case FileType.annotationZIP:
        case FileType.annotationCSV:
          if (
            !cameraLocation ||
            cameraLocation.state !== CameraLocationState.active
          ) {
            throw new errors.Http400(
              `The camera location ${form.cameraLocation} is not found.`,
            );
          }
          if (
            !cameraLocation.studyArea ||
            cameraLocation.studyArea.state !== StudyAreaState.active
          ) {
            throw new errors.Http404('Study area is not found.');
          }
          if (!cameraLocation.project || !cameraLocation.project.members) {
            throw new errors.Http404('The project is not found.');
          }
          if (
            req.user.permission !== UserPermission.administrator &&
            !cameraLocation.project.members.find(
              x => `${x.user._id}` === `${req.user._id}`,
            )
          ) {
            throw new errors.Http403();
          }
          break;
        default:
      }

      // Business logic
      if (
        [FileType.annotationImage, FileType.annotationZIP].indexOf(form.type) >=
        0
      ) {
        file.project = cameraLocation.project;
        _uploadSession = new UploadSessionModel({
          project: cameraLocation.project,
          user: req.user,
          file,
          cameraLocation,
        });
        const tasks = [_uploadSession.save()];
        if (req.file.buffer) {
          // memory storage
          tasks.unshift(file.saveWithContent(req.file.buffer));
        } else {
          // disk storage
          file.size = req.file.size;
          const stream = fs.createReadStream(req.file.path);
          tasks.unshift(
            file.saveWithContent(stream).then(result => {
              stream.close();
              fs.unlinkSync(req.file.path);
              return result;
            }),
          );
        }
        return Promise.all(tasks);
      }
      if (form.type === FileType.annotationCSV) {
        throw new errors.Http500('not done');
      }
      return Promise.all([file.saveWithContent(req.file.buffer)]);
    })
    .then(([file]) => {
      /*
      - Check the file has exif.
      @param file {FileModel} This is saved.
      @returns {Promise<FileModel>}
       */
      switch (file.type) {
        case FileType.annotationImage:
          if (!file.exif || !file.exif.dateTime) {
            _uploadSession.errorType = UploadSessionErrorType.lostExifTime;
            throw new errors.Http400(
              `Can't get the time information in the exif.`,
            );
          }
          break;
        default:
      }
      return file;
    })
    .then(file => {
      /*
      - Push a job into the task queue.
      @param file {FileModel}
      @returns {Promise<FileModel>}
       */
      if (
        [FileType.annotationImage, FileType.annotationZIP].indexOf(file.type) >=
        0
      ) {
        const job = utils.getTaskQueue().createJob(
          TaskWorker.mediaWorker,
          new MediaWorkerData({
            userId: `${req.user._id}`,
            projectId: `${file.project._id}`,
            fileId: `${file._id}`,
            uploadSessionId: `${_uploadSession._id}`,
            cameraLocationId: form.cameraLocation,
          }),
        );
        return new Promise((resolve, reject) => {
          job.save(error => {
            if (error) {
              return reject(error);
            }
            resolve(file);
          });
        });
      }
      return file;
    })
    .then(file => {
      res.json(file.dump());
    })
    .catch(error => {
      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.failure;
        _uploadSession.errorType =
          _uploadSession.errorType || UploadSessionErrorType.others;
        _uploadSession.save();
      }
      throw error;
    });
});
