const utils = require('./../common/utils');
const MediaWorkerData = require('./../models/dto/media-worker-data');

const job = utils.getTaskQueue().createJob(
  'media-worker',
  new MediaWorkerData({
    fileType: 'annotation-zip',
    userId: `5ce50ba64d063e3575786ea7`,
    projectId: `5d4bd8f480ab48eef9e95ec4`,
    fileId: `5d53a61d0bc2e4041a4e8bf0`,
    uploadSessionId: `5d53a61d0bc2e4041a4e8bf1`,
    cameraLocationId: `5d4bf03d80ab48eef9e95f23`,
  }),
);

job.save(error => {
  console.log(error);
});
