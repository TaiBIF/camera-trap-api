const mongoose = require('mongoose');
const utils = require('../../common/utils');

utils.connectDatabase();
const schema = utils.generateSchema(
  {
    name: {
      // 廠商維護編號
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
    collection: 'Camera-Vendor-Maintenance-Numbers',
  },
);
schema.index(
  { name: 1 },
  {
    name: 'CameraVendorMaintenanceNumbersName',
    background: true,
    unique: true,
  },
);

const model = mongoose.model('CameraVendorMaintenanceNumbersModel', schema);

model.prototype.dump = function() {
  const doc = {
    id: `${this._id}`,
    name: this.name,
    dataCount: this.dataCount,
  };

  return doc;
};

module.exports = model;
