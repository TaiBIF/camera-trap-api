const utils = require('../../common/utils');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const TaskWorker = require('../../models/const/task-worker');
const MediaWorkerData = require('../../models/dto/media-worker-data');

module.exports = async (user, file, cameraLocationId) => {
  const type = FileType.issueAttachment;

  const filename = file.originalname;

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
  });

  await fileObject.saveWithContent(file.buffer);

  const job = utils.getTaskQueue().createJob(
    TaskWorker.mediaWorker,
    new MediaWorkerData({
      fileType: type,
      userId: user._id,
      fileId: fileObject._id,
      cameraLocationId,
    }),
  );

  await job.save();

  return { ...fileObject.dump() };
};
