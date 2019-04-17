const mongoose = require('mongoose');
const utils = require('../../common/utils');
const SpeciesCode = require('../const/species-code');

const { Schema } = mongoose;
utils.connectDatabase();
const model = mongoose.model(
  'SpeciesModel',
  utils.generateSchema(
    {
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        required: true,
        index: {
          name: 'Project',
        },
      },
      title: {
        // 物種名稱
        'zh-TW': {
          // 繁體中文
          type: String,
          required: true,
          index: {
            // We will use species to search from .csv.
            name: 'TitleZhTW',
          },
        },
      },
      index: {
        // 排序 (由小到大)
        type: Number,
        default: 0,
      },
      code: {
        // 供「提示定義」使用
        type: String,
        enum: SpeciesCode.all(),
      },
    },
    {
      collection: 'Species',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
    index: this.index,
    code: this.code,
  };
};

module.exports = model;
