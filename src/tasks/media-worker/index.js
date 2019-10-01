const utils = require('../../common/utils');
const MediaWorkerData = require('../../models/dto/media-worker-data');
require('../../models/data/exchangeable-image-file-model'); // for populate
require('../../models/data/data-field-model'); // for populate
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const NotificationModel = require('../../models/data/notification-model');
const NotificationType = require('../../models/const/notification-type');
const UserModel = require('../../models/data/user-model');
const logger = require('../../logger');
const handleZipFile = require('./handleZipFile');

module.exports = async ({ id: jobId, data: jobData }, done) => {
  const { projectId, fileType } = jobData;
  const workerData = new MediaWorkerData(jobData);
  logger.info(
    `zip worker job[${jobId}] start. ${fileType}, projectId: ${projectId}`,
  );

  const user = await UserModel.findById(workerData.userId);
  const uploadSession = await UploadSessionModel.findById(
    workerData.uploadSessionId,
  )
    .where({ project: workerData.projectId })
    .where({ file: workerData.fileId });

  const notification = new NotificationModel({
    user,
    uploadSession,
  });

  try {
    await handleZipFile(workerData, uploadSession, user);

    uploadSession.state = UploadSessionState.success;
    await uploadSession.save();

    notification.type = NotificationType.uploadSuccess;
    await notification.save();

    logger.info(
      `zip worker job[${jobId}] end. ${fileType}, projectId: ${projectId}`,
    );

    done();
  } catch (error) {
    done(error);
    utils.logError(error, jobData);

    uploadSession.state = UploadSessionState.failure;
    uploadSession.errorType = error.type;
    uploadSession.errorMessage = error.message;
    await uploadSession.save();

    notification.type = NotificationType.uploadFailure;
    await notification.save();
  }
};
