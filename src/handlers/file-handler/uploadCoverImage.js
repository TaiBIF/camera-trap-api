const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');

module.exports = async (user, file, lastModified) => {
  const type = FileType.projectCoverImage;
  const fileObject = await new FileModel({
    type,
    user,
    originalFilename: file.originalname,
  });
  await fileObject.saveWithContent(file.buffer);
  return fileObject.dump();
};
