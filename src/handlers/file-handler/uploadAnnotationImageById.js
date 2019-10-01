const moment = require('moment');
const utils = require('../../common/utils');
const errors = require('../../models/errors');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const AnnotationState = require('../../models/const/annotation-state');
const AnnotationModel = require('../../models/data/annotation-model');

module.exports = async (user, file, annotationId) => {
  const type = FileType.annotationImage;

  const annotation = await AnnotationModel.findById(annotationId)
    .where({ state: AnnotationState.active })
    .populate('project');

  const exif = await utils.getExif(utils.convertBufferToStream(file.buffer));

  const filename = file.originalname;
  const fileDateTime = moment(
    exif.DateTimeOriginal,
    'YYYY:MM:DD HH:mm:ss',
  ).toISOString();

  if (!exif || !fileDateTime) {
    throw new errors.Http400(`Can't get the time information in the exif.`);
  }

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project: annotation.project,
  });

  annotation.file = fileObject;

  await fileObject.saveWithContent(file.buffer);
  await annotation.saveAndAddRevision(user);

  return { ...fileObject.dump() };
};
