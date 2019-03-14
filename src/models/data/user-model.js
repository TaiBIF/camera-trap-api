const { Schema } = require('mongoose');

const model = global.db.model(
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
  };
};

module.exports = model;
