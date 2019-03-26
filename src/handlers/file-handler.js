const util = require('util');
const config = require('config');
const multer = require('multer');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const FileType = require('../models/const/file-type');
const FileForm = require('../forms/file/file-form');
const FileModel = require('../models/data/file-model');

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

  const multerTable = {};
  multerTable[FileType.projectCoverImage] = imageMulter;
  return multerTable[form.type](req, res)
    .then(() => {
      const file = new FileModel({
        type: form.type,
        user: req.user,
        originalFilename: req.file.originalname,
      });
      if (form.type === FileType.projectCoverImage) {
        if (['jpg', 'png'].indexOf(file.getExtensionName()) < 0) {
          throw new errors.Http400('Just allow jpg and png files.');
        }
      }
      return file.saveWithContent(req.file.buffer);
    })
    .then(file => {
      res.json(file.dump());
    });
});
