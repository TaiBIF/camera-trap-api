const path = require('path');
const FileForm = require('../../forms/file/file-form');
const errors = require('../../models/errors');
const FileType = require('../../models/const/file-type');
const FileExtensionName = require('../../models/const/file-extension-name');
const uploadAnnotationImageById = require('./uploadAnnotationImageById');
const uploadAnnotationVideoById = require('./uploadAnnotationVideoById');
const multerTable = require('./multerMapping');

const getExtensionName = filename =>
  path
    .extname(filename)
    .replace('.', '')
    .toLowerCase();

const dashToCamel = string =>
  string.replace(/-([a-z])/g, g => g[1].toUpperCase());

/*
  POST /api/v1/files?type&projectId
  Content-Type: multipart/form-data
  The input name is "file" of the form.
*/
module.exports = async (req, res) => {
  const form = new FileForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  if (form.type === FileType.annotationVideo && !form.lastModified) {
    throw new errors.Http400('The field lastModified is required.');
  }

  await multerTable[form.type](req, res);

  const { file, user } = req;
  const fileExt = getExtensionName(file.originalname);
  const allowExtensionNames = FileExtensionName[dashToCamel(form.type)] || [];

  if (allowExtensionNames.indexOf(fileExt) < 0) {
    throw new errors.Http400(
      `Just allow ${allowExtensionNames.join(', ')} files.`,
    );
  }

  const { annotationId } = req.params;

  if (form.type === FileType.annotationImage) {
    res.json(await uploadAnnotationImageById(user, file, annotationId));
    return;
  }

  if (form.type === FileType.annotationVideo) {
    res.json(
      await uploadAnnotationVideoById(
        user,
        file,
        form.lastModified,
        annotationId,
      ),
    );
  }
};
