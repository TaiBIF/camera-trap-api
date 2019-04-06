const util = require('util');
const config = require('config');
const multer = require('multer');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const FileType = require('../models/const/file-type');
const FileForm = require('../forms/file/file-form');
const FileModel = require('../models/data/file-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationModel = require('../models/data/annotation-model');
const ProjectModel = require('../models/data/project-model');
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');
const UploadSessionErrorType = require('../models/const/upload-session-error-type');

const imageMulter = util.promisify(
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.limit.imageFileSize,
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
      if (!form.cameraLocation) {
        throw new errors.Http400('The cameraLocation is required.');
      }
      break;
    case FileType.annotationCSV:
      if (!form.project) {
        throw new errors.Http400('The project is required.');
      }
      break;
    default:
  }

  let uploadSession;
  const multerTable = {};
  multerTable[FileType.projectCoverImage] = imageMulter;
  multerTable[FileType.annotationImage] = imageMulter;
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
        case FileType.annotationCSV:
          if (file.getExtensionName() !== 'csv') {
            throw new errors.Http400('Just allow csv files.');
          }
          break;
        default:
      }

      switch (form.type) {
        case FileType.annotationImage:
          return Promise.all([
            file,
            null,
            CameraLocationModel.findById(form.cameraLocation)
              .populate('project')
              .populate('studyArea'),
          ]);
        case FileType.annotationCSV:
          return Promise.all([file, ProjectModel.findById(form.project)]);
        default:
          return Promise.all([file]);
      }
    })
    .then(([file, project, cameraLocation]) => {
      /*
      - Check authorization of the project, study area, camera location.
      - Append a field `project` of the file.
      - Create an annotation.
      - Save a file.
      @param file {FileModel} This file didn't save. We should check the permission.
      @param project {ProjectModel|null}
      @param cameraLocation {CameraLocationModel|null}
      @returns {Promise<[{FileModel}, {AnnotationModel|null}]>}
       */
      // Authorization
      switch (form.type) {
        case FileType.annotationImage:
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
        case FileType.annotationCSV:
          if (!project) {
            throw new errors.Http404();
          }
          if (
            req.user.permission !== UserPermission.administrator &&
            !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
          ) {
            throw new errors.Http403();
          }
          break;
        default:
      }

      // Business logic
      if (form.type === FileType.annotationImage) {
        file.project = cameraLocation.project;
        uploadSession = new UploadSessionModel({
          project: cameraLocation.project,
          user: req.user,
          file,
          cameraLocation,
        });
        const annotation = new AnnotationModel({
          project: cameraLocation.project,
          studyArea: cameraLocation.studyArea,
          cameraLocation,
          file,
          filename: file.originalFilename,
          time: new Date(), // We will update this fake time.
        });
        return Promise.all([
          file.saveWithContent(req.file.buffer),
          annotation,
          uploadSession.save(),
        ]);
      }
      if (form.type === FileType.annotationCSV) {
        throw new errors.Http500('not done');
      }
      return Promise.all([file.saveWithContent(req.file.buffer)]);
    })
    .then(([file, annotation]) => {
      /*
      - Append fields `file` and `time` of the annotation.
      - Find the duplicate annotation.
        使用樣區、相機位置、檔名、時間檢查是否已存在 annotation，存在的話替換 annotation.file。
      @param file {FileModel} This is saved.
      @param annotation {AnnotationModel|null} This is didn't save. It is missing a field `time`.
      @returns {Promise<[{FileModel}, {AnnotationModel|null}, {AnnotationModel|null}]>}
       */
      if (annotation) {
        if (!file.exif || !file.exif.dateTime) {
          uploadSession.errorType = UploadSessionErrorType.lostExifTime;
          throw new errors.Http400(
            `Can't get the time information in the exif.`,
          );
        }
        return Promise.all([
          file,
          annotation,
          AnnotationModel.where({ cameraLocation: annotation.cameraLocation })
            .where({ filename: annotation.filename })
            .where({ time: annotation.time })
            .findOne(),
        ]);
      }
      return Promise.all([file]);
    })
    .then(([file, annotation, duplicateAnnotation]) => {
      /*
      - Save annotation or duplicateAnnotation.
      - Set uploadSession.state as success then save it.
      @param file {FileModel}
      @param annotation {AnnotationModel} This is didn't save.
      @param duplicateAnnotation {AnnotationModel}
      @returns {Promise<[{FileModel}]>}
       */
      const tasks = [file];
      if (annotation) {
        if (duplicateAnnotation) {
          // Replace the old file with a new one.
          duplicateAnnotation.file = file;
          tasks.push(duplicateAnnotation.saveAndAddRevision(req.user));
        } else {
          tasks.push(annotation.saveAndAddRevision(req.user));
        }
        uploadSession.state = UploadSessionState.success;
        tasks.push(uploadSession.save());
      }
      return Promise.all(tasks);
    })
    .then(([file]) => {
      res.json(file.dump());
    })
    .catch(error => {
      if (uploadSession) {
        uploadSession.state = UploadSessionState.failure;
        uploadSession.errorType =
          uploadSession.errorType || UploadSessionErrorType.others;
        uploadSession.save();
      }
      throw error;
    });
});
