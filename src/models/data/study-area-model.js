const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const StudyAreaState = require('../const/study-area-state');

const db = utils.getDatabaseConnection();
const model = db.model(
  'StudyAreaModel',
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
      state: {
        // 狀態
        // 因相機使用軟刪除，樣區也必須使用軟刪除
        type: String,
        default: StudyAreaState.active,
        enum: StudyAreaState.all(),
        index: {
          name: 'State',
        },
      },
      title: {
        // 樣區名稱
        'zh-TW': {
          // 繁體中文
          type: String,
          index: {
            name: 'TitleZhTW',
          },
        },
      },
      parent: {
        // 子樣區的話會有上層的 id
        type: Schema.ObjectId,
        ref: 'StudyAreaModel',
      },
    },
    {
      collection: 'StudyAreas',
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
