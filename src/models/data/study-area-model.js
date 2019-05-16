const mongoose = require('mongoose');
const utils = require('../../common/utils');
const StudyAreaState = require('../const/study-area-state');
const getByProjectId = require('../static/studyArea/static-getByProjectId');

const { Schema } = mongoose;
utils.connectDatabase();
const schema = utils.generateSchema(
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
        // index: UniqueTitle
        type: String,
        required: true,
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
);
schema.index(
  { project: 1, 'title.zh-TW': 1 },
  {
    name: 'UniqueTitle',
    background: true,
    unique: true,
    partialFilterExpression: {
      state: StudyAreaState.active,
    },
  },
);

schema.static('getByProjectId', getByProjectId);

//
const model = mongoose.model('StudyAreaModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
    parent:
      this.parent && typeof this.parent.dump === 'function'
        ? this.parent.dump()
        : this.parent,
  };
};

module.exports = model;
