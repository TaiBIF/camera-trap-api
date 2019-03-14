const { Schema } = require('mongoose');
const UserPermission = require('../const/user-permission');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'UserModel',
  Schema(
    {
      orcId: {
        type: String,
        required: true,
        index: {
          name: 'OrcID',
          unique: true,
        },
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        index: {
          name: 'Email',
        },
      },
      permission: {
        type: String,
        required: true,
        enum: UserPermission.all(),
      },
    },
    {
      collection: 'Users',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    name: this.name,
    email: this.email,
  };
};

module.exports = model;
