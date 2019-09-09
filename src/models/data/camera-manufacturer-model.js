const mongoose = require('mongoose');
const utils = require('../../common/utils');

utils.connectDatabase();
const schema = utils.generateSchema(
  {
    name: {
      // 廠牌
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
    collection: 'CameraManufacturers',
  },
);
schema.index(
  { name: 1 },
  {
    name: 'CameraManufacturersName',
    background: true,
    unique: true,
  },
);

const model = mongoose.model('CameraManufacturersModel', schema);

model.prototype.dump = function() {
  const doc = {
    id: `${this._id}`,
    name: this.name,
    dataCount: this.dataCount,
  };

  return doc;
};

module.exports = model;
