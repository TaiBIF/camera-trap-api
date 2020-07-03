const fs = require('fs');
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

module.exports = async (
  user,
  file,
  lastModified,
  cameraLocationId,
  workingRange,
) => {
  const type = FileType.annotationVideo;

  const cameraLocation = await fetchCameraLocation(cameraLocationId, user);
  const { project, studyArea } = cameraLocation;

  const uploadSession = new UploadSessionModel({
    project,
    user,
    cameraLocation,
  });

  const exif = await utils.getExif(fs.createReadStream(file.path));

  const filename = file.originalname;
  const fileDateTime = lastModified;

  if (!exif || !fileDateTime) {
    uploadSession.state = UploadSessionState.failure;
    uploadSession.errorType = lostExifTime;
    await uploadSession.save();
    throw new errors.Http400(`Can't get the time information in the exif.`);
  }

  const fileObject = new FileModel({
    type,
    user,
    originalFilename: filename,
    project,
  });

  await fileObject.saveWithContent(file.path, lastModified);
  fs.unlinkSync(file.path);

  uploadSession.file = fileObject._id;
  console.log('ueueueueu');
  const startWorkingDate =
    workingRange !== undefined && workingRange.split(',').length === 2
      ? workingRange.split(',')[0]
      : undefined;
  const endWorkingDate =
    workingRange !== undefined && workingRange.split(',').length === 2
      ? workingRange.split(',')[1]
      : undefined;

  const annotation = new AnnotationModel({
    project,
    state: AnnotationState.active,
    studyArea,
    cameraLocation,
    uploadSession,
    file: fileObject,
    filename,
    time: fileDateTime,
    startWorkingDate,
    endWorkingDate,
  });

  uploadSession.state = UploadSessionState.success;

  await annotation.save();
  await uploadSession.save();

  return { ...fileObject.dump(), uploadSession: uploadSession._id };
};
