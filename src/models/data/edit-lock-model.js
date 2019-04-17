const mongoose = require('mongoose');
const utils = require('../../common/utils');

const { Schema } = mongoose;
utils.connectDatabase();
const model = mongoose.model(
  'EditLockModel',
  utils.generateSchema(
    {
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
        required: true,
      },
      studyArea: {
        type: Schema.ObjectId,
        ref: 'StudyAreaModel',
        required: true,
        index: {
          name: 'StudyArea',
        },
      },
      user: {
        type: Schema.ObjectId,
        ref: 'UserModel',
        required: true,
      },
      expiredTime: {
        // 超過此時間後自動解鎖
        type: Date,
        required: true,
        index: {
          name: 'ExpiredTime',
        },
      },
    },
    {
      collection: 'EditLocks',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    user:
      this.user && typeof this.user.dump === 'function'
        ? this.user.dump()
        : this.user,
  };
};

module.exports = model;
