const mongoose = require('mongoose');
const UserPermission = require('../const/user-permission');
const utils = require('../../common/utils');

const { Schema } = mongoose;
utils.connectDatabase();
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
    hotkeys: [
      {
        _id: false,
        species: {
          type: Schema.ObjectId,
          ref: 'SpeciesModel',
          required: true,
        },
        hotkey: {
          type: String,
          required: true,
        },
      },
    ],
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
schema.method('isLogin', function() {
  return this.isNew === false;
});
schema.method('dump', function(req) {
  return {
    id: `${this._id}`,
    name: this.name,
    email: this.email,
    permission: this.permission,
    hotkeys:
      req && req.user && `${req.user._id}` === `${this._id}`
        ? this.hotkeys
        : undefined,
  };
});
module.exports = mongoose.model('UserModel', schema);
