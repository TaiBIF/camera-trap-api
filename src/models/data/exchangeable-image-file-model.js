const mongoose = require('mongoose');
const utils = require('../../common/utils');

utils.connectDatabase();
const schema = utils.generateSchema(
  {
    make: {
      // 相機製造商
      type: String,
    },
    model: {
      // 相機型號
      type: String,
    },
    dateTime: {
      // 拍照當下時間，用 GMT+8 換算成 UTC。
      type: Date,
    },
    rawData: {
      type: String,
    },
  },
  {
    collection: 'ExchangeableImageFiles',
  },
);
const model = mongoose.model('ExchangeableImageFileModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    make: this.make,
    model: this.model,
    dateTime: this.dateTime,
    rawData: this.rawData,
  };
};

module.exports = model;
