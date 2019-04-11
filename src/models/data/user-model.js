const UserPermission = require('../const/user-permission');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const schema = utils.generateSchema(
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
      // index: UniqueEmail
      type: String,
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
);
schema.index(
  { email: 1 },
  {
    name: 'UniqueEmail',
    background: true,
    unique: true,
    partialFilterExpression: {
      email: { $exists: true },
    },
  },
);
const model = db.model('UserModel', schema);

model.prototype.isLogin = function() {
  return this.isNew === false;
};

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    name: this.name,
    email: this.email,
    permission: this.permission,
  };
};

module.exports = model;
