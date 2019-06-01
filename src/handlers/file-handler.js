const fs = require('fs');
const util = require('util');
const config = require('config');
const multer = require('multer');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const utils = require('../common/utils');
const UserPermission = require('../models/const/user-permission');
const FileType = require('../models/const/file-type');
const FileExtensionName = require('../models/const/file-extension-name');
const FileForm = require('../forms/file/file-form');
const FileModel = require('../models/data/file-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const StudyAreaState = require('../models/const/study-area-state');
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');
const UploadSessionErrorType = require('../models/const/upload-session-error-type');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const MediaWorkerData = require('../models/dto/media-worker-data');
const TaskWorker = require('../models/const/task-worker');

const multers = {
  image: util.promisify(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: config.limit.imageFileSize },
    }).single('file'),
  ),
  video: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.videoFileSize },
    }).single('file'),
  ),
  csv: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.csvFileSize },
    }).single('file'),
  ),
  zip: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.zipFileSize },
    }).single('file'),
  ),
  issueAttachment: util.promisify(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: config.limit.issueAttachmentSize },
    }).single('file'),
  ),
};

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
    case FileType.annotationVideo:
      if (!form.lastModified) {
        throw new errors.Http400('The field lastModified is required.');
      }
    // eslint-disable-next-line no-fallthrough
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
  multerTable[FileType.projectCoverImage] = multers.image;
  multerTable[FileType.annotationImage] = multers.image;
  multerTable[FileType.annotationVideo] = multers.video;
  multerTable[FileType.annotationCSV] = multers.csv;
  multerTable[FileType.annotationZIP] = multers.zip;
  multerTable[FileType.issueAttachment] = multers.issueAttachment;
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
      let allowExtensionNames;
      switch (form.type) {
        case FileType.projectCoverImage:
          allowExtensionNames = FileExtensionName.projectCoverImage;
          break;
        case FileType.annotationImage:
          allowExtensionNames = FileExtensionName.annotationImage;
          break;
        case FileType.annotationVideo:
          allowExtensionNames = FileExtensionName.annotationVideo;
          break;
        case FileType.annotationZIP:
          allowExtensionNames = FileExtensionName.annotationZip;
          break;
        case FileType.annotationCSV:
          allowExtensionNames = FileExtensionName.annotationCsv;
          break;
        case FileType.issueAttachment:
          allowExtensionNames = FileExtensionName.issueAttachment;
          break;
        default:
      }
      if (allowExtensionNames.indexOf(file.getExtensionName()) < 0) {
        throw new errors.Http400(
          `Just allow ${allowExtensionNames.join(', ')} files.`,
        );
      }

      switch (form.type) {
        case FileType.annotationImage:
        case FileType.annotationVideo:
        case FileType.annotationZIP:
        case FileType.annotationCSV:
          return Promise.all([
            file,
            CameraLocationModel.findById(form.cameraLocation)
              .where({ state: CameraLocationState.active })
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
      - Append a field `project` of the file. (annotations)
      - Save upload session. (annotations)
      - Save a file (upload to s3).
      @param file {FileModel} This file didn't save. We should check the permission.
      @param cameraLocation {CameraLocationModel|null}
      @returns {Promise<[{FileModel}]>}
       */
      // Authorization
      switch (form.type) {
        case FileType.annotationImage:
        case FileType.annotationVideo:
        case FileType.annotationZIP:
        case FileType.annotationCSV:
          if (!cameraLocation) {
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
          if (!cameraLocation.project.canAccessBy(req.user)) {
            throw new errors.Http403();
          }
          break;
        default:
      }

      // Business logic
      if (
        [
          FileType.annotationImage,
          FileType.annotationVideo,
          FileType.annotationZIP,
          FileType.annotationCSV,
        ].indexOf(form.type) >= 0
      ) {
        // The file for annotations.
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
          tasks.unshift(
            file
              .saveWithContent(req.file.path, form.lastModified)
              .then(result => {
                fs.unlinkSync(req.file.path);
                return result;
              }),
          );
        }
        return Promise.all(tasks);
      }

      // FileType.projectCoverImage, FileType.issueAttachment
      return Promise.all([file.saveWithContent(req.file.buffer)]);
    })
    .then(([file]) => {
      /*
      - Check the file has exif. (for FileType.annotationImage)
      - Push a job into the task queue. (for annotations)
      @param file {FileModel}
      @returns {Promise<FileModel>}
       */
      if (
        [FileType.annotationImage, FileType.annotationVideo].indexOf(
          file.type,
        ) >= 0
      ) {
        if (!file.exif || !file.exif.dateTime) {
          _uploadSession.errorType = UploadSessionErrorType.lostExifTime;
          throw new errors.Http400(
            `Can't get the time information in the exif.`,
          );
        }
      }

      if (
        [
          FileType.annotationImage,
          FileType.annotationVideo,
          FileType.annotationCSV,
          FileType.annotationZIP,
        ].indexOf(file.type) >= 0
      ) {
        const job = utils.getTaskQueue().createJob(
          TaskWorker.mediaWorker,
          new MediaWorkerData({
            fileType: file.type,
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
      const result = file.dump();
      if (_uploadSession) {
        result.uploadSession = `${_uploadSession._id}`;
      }
      res.json(result);
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

exports.uploadAnnotationFile = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/annotations/:annotationId/file?type
  Content-Type: multipart/form-data
  The input name is "file" of the form.

  Direct update the file of the annotation.
  - The annotation time will not update to file.exif.dateTime.
  - The annotation filename will not update to file.originalFilename.
  * Replace `PUT` with `POST` because of that this is multipart form data.
   */
  const form = new FileForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  let multipart;
  switch (form.type) {
    case FileType.annotationImage:
      multipart = multers.image;
      break;
    case FileType.annotationVideo:
      if (!form.lastModified) {
        throw new errors.Http400('Missing lastModified.');
      }
      multipart = multers.video;
      break;
    default:
      throw new errors.Http400('The type not allow.');
  }
  return multipart(req, res)
    .then(() => {
      /*
      - Do validations.
      - Fetch the annotation.
       */
      if (!req.file) {
        throw new errors.Http400('Missing file.');
      }

      const file = new FileModel({
        type: form.type,
        user: req.user,
        originalFilename: req.file.originalname,
      });
      let allowExtensionNames;
      switch (form.type) {
        case FileType.annotationImage:
          allowExtensionNames = FileExtensionName.annotationImage;
          break;
        case FileType.annotationVideo:
          allowExtensionNames = FileExtensionName.annotationVideo;
          break;
        default:
      }
      if (allowExtensionNames.indexOf(file.getExtensionName()) < 0) {
        throw new errors.Http400(
          `Just allow ${allowExtensionNames.join(', ')} files.`,
        );
      }

      return Promise.all([
        file,
        AnnotationModel.findById(req.params.annotationId)
          .where({ state: AnnotationState.active })
          .populate('project'),
      ]);
    })
    .then(([file, annotation]) => {
      /*
      - Do authorization.
      - Save the file content to S3.
       */
      if (!annotation) {
        throw new errors.Http404();
      }
      if (!annotation.project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      if (req.file.buffer) {
        // memory storage
        return Promise.all([file.saveWithContent(req.file.buffer), annotation]);
      }
      // disk storage
      return Promise.all([
        file.saveWithContent(req.file.path, form.lastModified).then(result => {
          fs.unlinkSync(req.file.path);
          return result;
        }),
        annotation,
      ]);
    })
    .then(([file, annotation]) => {
      /*
      - Update the annotation.file.
       */
      annotation.file = file;
      return annotation.saveAndAddRevision(req.user);
    })
    .then(annotation => {
      const uploadSession = new UploadSessionModel({
        state: UploadSessionState.success,
        project: annotation.project,
        cameraLocation: annotation.cameraLocation,
        user: req.user,
        file: annotation.file,
      });
      uploadSession.save().catch(error => {
        utils.logError(error, { uploadSession });
      });
      const result = annotation.file.dump();
      result.uploadSession = `${uploadSession._id}`;
      res.json(result);
    });
});
