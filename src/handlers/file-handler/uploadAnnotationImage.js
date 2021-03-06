﻿const moment = require('moment');
const utils = require('../../common/utils');
const errors = require('../../models/errors');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const AnnotationState = require('../../models/const/annotation-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const StudyAreaState = require('../../models/const/study-area-state');
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const AnnotationModel = require('../../models/data/annotation-model');

const {
  lostExifTime,
} = require('../../models/const/upload-session-error-type');

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
  const type = FileType.annotationImage;

  const cameraLocation = await fetchCameraLocation(cameraLocationId, user);
  const { project, studyArea } = cameraLocation;

  const uploadSession = new UploadSessionModel({
    project,
    user,
    cameraLocation,
  });

  const exif = await utils.getExif(utils.convertBufferToStream(file.buffer));

  const filename = file.originalname;
  const fileDateTime = moment(
    exif.DateTimeOriginal,
    'YYYY:MM:DD HH:mm:ss',
  ).toISOString();

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project,
  });

  await fileObject.saveWithContent(file.buffer);
  uploadSession.file = fileObject;

  if (!exif || !fileDateTime) {
    uploadSession.state = UploadSessionState.failure;
    uploadSession.errorType = lostExifTime;
    await uploadSession.save();
    throw new errors.Http400(`無法取得圖片 Exif 時間`);
  }

  const annotation = new AnnotationModel({
    project,
    state: AnnotationState.active,
    studyArea,
    cameraLocation,
    uploadSession,
    file: fileObject,
    filename,
    time: fileDateTime,
  });

  await annotation.save();
  uploadSession.state = UploadSessionState.success;
  await uploadSession.save();

  return { ...fileObject.dump(), uploadSession: uploadSession._id };
};
