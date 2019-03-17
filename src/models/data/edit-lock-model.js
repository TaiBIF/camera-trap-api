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
      camera: {
        type: Schema.ObjectId,
        ref: 'ProjectCameraModel',
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
