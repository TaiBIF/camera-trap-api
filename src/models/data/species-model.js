const mongoose = require('mongoose');
const utils = require('../../common/utils');
const SpeciesCode = require('../const/species-code');

utils.connectDatabase();
const schema = utils.generateSchema(
  {
    isDefault: {
      // Put this species into the new project.
      type: Boolean,
    },
    title: {
      // 物種名稱
      'zh-TW': {
        // 繁體中文
        type: String,
        required: true,
        index: {
          name: 'TitleZhTW',
          unique: true,
        },
      },
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
);

schema.method('dump', function() {
  return {
    id: `${this._id}`,
    title: this.title,
    code: this.code,
  };
});

module.exports = mongoose.model('SpeciesModel', schema);
