const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const UploadSessionState = require('../const/upload-session-state');

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
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        required: true,
        index: {
          name: 'Project',
        },
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
      originalName: {
        // The original filename.
        type: String,
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
    project:
      this.project && typeof this.project.dump === 'function'
        ? this.project.dump()
        : this.project,
    originalName: this.originalName,
    createTime: this.createTime,
  };
};

module.exports = model;
