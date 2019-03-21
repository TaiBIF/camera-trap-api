const UserPermission = require('../const/user-permission');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'UserModel',
  utils.generateSchema(
    {
      orcId: {
        // https://orcid.org/
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
        // 使用者權限
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

model.prototype.isLogin = function() {
  return !!this._id;
};

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    name: this.name,
    email: this.email,
  };
};

module.exports = model;
