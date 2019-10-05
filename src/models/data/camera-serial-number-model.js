const mongoose = require('mongoose');
const utils = require('../../common/utils');

utils.connectDatabase();
const schema = utils.generateSchema(
  {
    name: {
      // 相機序號
      // index: UniqueName
      type: String,
      required: true,
      index: {
        name: 'Name',
      },
    },
    dataCount: {
      type: Number,
      required: true,
    },
  },
  {
    collection: 'CameraSerialNumbers',
  },
);
schema.index(
  { name: 1 },
  {
    name: 'CameraSerialNumbersName',
    background: true,
    unique: true,
  },
);

const model = mongoose.model('CameraSerialNumbersModel', schema);

model.prototype.dump = function() {
  const doc = {
    id: `${this._id}`,
    name: this.name,
    dataCount: this.dataCount,
  };

  return doc;
};

module.exports = model;
