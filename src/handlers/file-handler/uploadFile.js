const path = require('path');
const FileForm = require('../../forms/file/file-form');
const errors = require('../../models/errors');
const FileType = require('../../models/const/file-type');
const FileExtensionName = require('../../models/const/file-extension-name');
const uploadCoverImage = require('./uploadCoverImage');
const uploadAnnotationImage = require('./uploadAnnotationImage');
const uploadAnnotationVideo = require('./uploadAnnotationVideo');
const uploadAnnotationByZip = require('./uploadAnnotationByZip');
const uploadAnnotationCsv = require('./uploadAnnotationCsv');
const uploadIssueAttachment = require('./uploadIssueAttachment');
const multerTable = require('./multerMapping');

const needCheckCameraLocaion = type => {
  if (
    type === FileType.annotationImage ||
    type === FileType.annotationZIP ||
    type === FileType.annotationCSV
  ) {
    return true;
  }
  return false;
};

const needCheckLastModified = type => {
  if (type === FileType.annotationVideo) {
    return true;
  }

  return false;
};

const getExtensionName = filename =>
  path
    .extname(filename)
    .replace('.', '')
    .toLowerCase();

const dashToCamel = string =>
  string.replace(/-([a-z])/g, g => g[1].toUpperCase());

/*
 * POST /api/v1/files?type&projectId
 */
module.exports = async (req, res) => {
  const form = new FileForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  if (needCheckCameraLocaion(form.type) && !form.cameraLocation) {
    throw new errors.Http400('The cameraLocation is required.');
  }

  if (needCheckLastModified(form.type) && !form.lastModified) {
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

  if (form.type === FileType.projectCoverImage) {
    res.json(await uploadCoverImage(user, file, form.lastModified));
    return;
  }

  if (form.type === FileType.annotationImage) {
    res.json(
      await uploadAnnotationImage(
        user,
        file,
        form.cameraLocation,
        form.workingRange,
      ),
    );
    return;
  }

  if (form.type === FileType.annotationVideo) {
    const { lastModified, cameraLocation } = form;
    res.json(
      await uploadAnnotationVideo(
        user,
        file,
        lastModified,
        cameraLocation,
        form.workingRange,
      ),
    );
    return;
  }

  if (form.type === FileType.annotationZIP) {
    res.json(
      await uploadAnnotationByZip(
        user,
        file,
        form.cameraLocation,
        form.workingRange,
      ),
    );
    return;
  }

  if (form.type === FileType.annotationCSV) {
    res.json(
      await uploadAnnotationCsv(
        user,
        file,
        form.cameraLocation,
        form.workingRange,
      ),
    );
    return;
  }

  if (form.type === FileType.issueAttachment) {
    res.json(await uploadIssueAttachment(user, file, form.cameraLocation));
  }
};
