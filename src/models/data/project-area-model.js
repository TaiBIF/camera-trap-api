const mongoose = require('mongoose');
const AreaType = require('../const/area-type');
const utils = require('../../common/utils');

utils.connectDatabase();
const model = mongoose.model(
  'ProjectAreaModel',
  utils.generateSchema(
    {
      title: {
        // 縣市名稱
        'zh-TW': {
          // 繁體中文
          type: String,
          required: true,
          index: {
            // This is for sort.
            name: 'TitleZhTW',
          },
        },
        'en-US': {
          // English
          type: String,
          required: true,
          index: {
            // This is for sort.
            name: 'TitleEnUS',
          },
        },
      },
      // 專案區域
      type: {
        type: String,
        enum: AreaType.all(),
      },
      dataCount: {
        type: Number,
        default: 0,
      },
    },
    {
      collection: 'ProjectAreas',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
    type: this.type,
    dataCount: this.dataCount,
  };
};

module.exports = model;
