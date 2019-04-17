const mongoose = require('mongoose');
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
  };
};

module.exports = model;
