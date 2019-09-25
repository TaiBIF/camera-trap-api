const fs = require('fs');
const utils = require('../../common/utils');
const errors = require('../../models/errors');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const StudyAreaState = require('../../models/const/study-area-state');
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const UploadSessionErrorType = require('../..//models/const/upload-session-error-type');
const TaskWorker = require('../../models/const/task-worker');
const MediaWorkerData = require('../../models/dto/media-worker-data');

const fetchCameraLocation = async (cameraLocationId, user) => {
  const cameraLocation = await CameraLocationModel.findById(cameraLocationId)
    .where({
      state: CameraLocationState.active,
    })
    .populate('project')
    .populate('studyArea');

  if (!cameraLocation.project.canAccessBy(user)) {
    throw new errors.Http403();
  }

  if (
    !cameraLocation.studyArea ||
    cameraLocation.studyArea.state !== StudyAreaState.active
  ) {
    throw new errors.Http404('Study area is not found.');
  }

  if (!cameraLocation) {
    throw new errors.Http400(
      `The camera location ${cameraLocationId} is not found.`,
    );
  }
  if (!cameraLocation.project.canAccessBy(user)) {
    throw new errors.Http403();
  }

  return cameraLocation;
};

module.exports = async (user, file, cameraLocationId) => {
  const type = FileType.annotationZIP;
  const cameraLocation = await fetchCameraLocation(cameraLocationId, user);
  const { project } = cameraLocation;

  const filename = file.originalname;

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project,
  });

  const uploadSession = new UploadSessionModel({
    project,
    user,
    cameraLocation,
    file: fileObject,
  });

  await uploadSession.save();

  fileObject
    .saveWithContent(file.path)
    .then(() => {
      const job = utils.getTaskQueue().createJob(
        TaskWorker.mediaWorker,
        new MediaWorkerData({
          fileType: type,
          userId: user._id,
          projectId: project._id,
          fileId: fileObject._id,
          uploadSessionId: uploadSession._id,
          cameraLocationId,
        }),
      );
      job.save();
    })
    .catch(e => {
      uploadSession.state = UploadSessionState.failure;
      uploadSession.errorType = UploadSessionErrorType.others;
      uploadSession.errorMessage = `檔案傳送過程中毀損`;
      uploadSession.save();
    })
    .then(() => {
      fs.unlinkSync(file.path);
    });

  return { ...fileObject.dump(), uploadSession: uploadSession._id };
};
