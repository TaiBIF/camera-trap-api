const { Schema } = require('mongoose');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
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
      site: {
        type: Schema.ObjectId,
        ref: 'ProjectSiteModel',
        required: true,
        index: {
          name: 'Site',
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
  };
};

module.exports = model;
