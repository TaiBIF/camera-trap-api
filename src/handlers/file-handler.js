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
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');

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
  if (form.type === FileType.annotationImage) {
    if (!form.cameraLocation) {
      throw new errors.Http400('The cameraLocation is required.');
    }
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
      if (
        [FileType.projectCoverImage, FileType.annotationImage].indexOf(
          form.type,
        ) >= 0
      ) {
        if (['jpg', 'png'].indexOf(file.getExtensionName()) < 0) {
          throw new errors.Http400('Just allow jpg and png files.');
        }
      }
      if (form.type === FileType.annotationImage) {
        return Promise.all([
          file,
          CameraLocationModel.findById(form.cameraLocation)
            .populate('project')
            .populate('studyArea'),
        ]);
      }
      return Promise.all([file]);
    })
    .then(([file, cameraLocation]) => {
      /*
      - Check authorization of the project, study area, camera location.
      - Append a field `project` of the file.
      - Create an annotation.
      - Save a file.
      @param file {FileModel} This file didn't save. We should check the permission.
      @param cameraLocation {CameraLocationModel|null}
      @returns {Promise<[{FileModel}, {AnnotationModel|null}]>}
       */
      if (form.type === FileType.annotationImage) {
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
        });
        return Promise.all([
          file.saveWithContent(req.file.buffer),
          annotation,
          uploadSession.save(),
        ]);
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
        if (file.exif) {
          annotation.time = file.exif.dateTime;
        }
        return Promise.all([
          file,
          annotation,
          AnnotationModel.where({ cameraLocation: annotation.cameraLocation })
            .where({ filename: annotation.filename })
            .where({ time: annotation.time })
            .populate('file')
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
          if (duplicateAnnotation.file) {
            // Delete the old file.
            tasks.push(duplicateAnnotation.file.delete());
          }
          // Replace the old file with a new one.
          duplicateAnnotation.file = file;
          tasks.push(duplicateAnnotation.save());
        } else {
          // todo: 檢查檔名是否連續、相片時間是否合理
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
        uploadSession.save();
      }
      throw error;
    });
});
