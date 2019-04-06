const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const UploadSessionState = require('../const/upload-session-state');
const UploadSessionErrorType = require('../const/upload-session-error-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'UploadSessionModel',
  utils.generateSchema(
    {
      state: {
        type: String,
        default: UploadSessionState.uploading,
        enum: UploadSessionState.all(),
      },
      errorType: {
        type: String,
        enum: UploadSessionErrorType.all(),
      },
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        required: true,
        index: {
          name: 'Project',
        },
      },
      cameraLocation: {
        type: Schema.ObjectId,
        ref: 'CameraLocationModel',
      },
      user: {
        // uploader
        type: Schema.ObjectId,
        ref: 'UserModel',
        required: true,
        index: {
          name: 'User',
        },
      },
      file: {
        type: Schema.ObjectId,
        ref: 'FileModel',
        required: true,
      },
    },
    {
      collection: 'UploadSessions',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    state: this.state,
    errorType: this.errorType,
    project:
      this.project && typeof this.project.dump === 'function'
        ? this.project.dump()
        : this.project,
    cameraLocation:
      this.cameraLocation && typeof this.cameraLocation.dump === 'function'
        ? this.cameraLocation.dump()
        : this.cameraLocation,
    file:
      this.file && typeof this.file.dump === 'function'
        ? this.file.dump()
        : this.file,
    createTime: this.createTime,
  };
};

module.exports = model;
