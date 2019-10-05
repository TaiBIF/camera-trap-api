const fs = require('fs');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');

module.exports = async (user, file, lastModified, annotationId) => {
  const type = FileType.annotationVideo;

  const annotation = await AnnotationModel.findById(annotationId)
    .where({ state: AnnotationState.active })
    .populate('project');

  const filename = file.originalname;

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project: annotation.project,
  });

  await fileObject.saveWithContent(file.path, lastModified);
  fs.unlinkSync(file.path);

  annotation.file = fileObject;

  await annotation.saveAndAddRevision(user);

  return { ...fileObject.dump() };
};
