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
      throw new errors.Http400('studyArea and cameraLocation are required.');
    }
  }

  const multerTable = {};
  multerTable[FileType.projectCoverImage] = imageMulter;
  multerTable[FileType.annotationImage] = imageMulter;
  return multerTable[form.type](req, res)
    .then(() => {
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
      @param file {FileModel} This file didn't save. We should check the permission.
      @param cameraLocation {CameraLocationModel|null}
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
        const annotation = new AnnotationModel({
          project: cameraLocation.project,
          studyArea: cameraLocation.studyArea,
          cameraLocation,
          filename: file.originalFilename,
          time: new Date(), // todo: from exif
        });
        return Promise.all([file.saveWithContent(req.file.buffer), annotation]);
      }
      return Promise.all([file.saveWithContent(req.file.buffer)]);
    })
    .then(([file, annotation]) => {
      /*
      @param file {FileModel} This is saved.
      @param annotation {AnnotationModel} This is didn't save. It is missing a field `file`.
       */
      if (annotation) {
        annotation.file = file;
        if (file.exif) {
          annotation.time = file.exif.dateTime;
        }
        return Promise.all([file, annotation.saveWithRevision(req.user)]);
      }
      return Promise.all([file]);
    })
    .then(([file]) => {
      res.json(file.dump());
    });
});
