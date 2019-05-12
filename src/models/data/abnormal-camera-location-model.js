const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AbnormalType = require('../const/abnormal-type');

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
    cameraLocation: {
      // 相機位置
      type: Schema.ObjectId,
      ref: 'CameraLocationModel',
      required: true,
      index: {
        name: 'CameraLocation',
      },
    },
    studyArea: {
      // 樣區
      type: String,
      required: true,
      index: {
        name: 'StudyArea',
      },
    },
    studySubarea: {
      // 子樣區
      type: String,
      required: true,
      index: {
        name: 'StudySubarea',
      },
    },
    abnormalStartDate: {
      // 異常資料時間 (開始)
      type: Date,
      required: true,
      index: {
        name: 'AbnormalStartDate',
      },
    },
    abnormalEndDate: {
      // 異常資料時間 (結束)
      type: Date,
      required: true,
      index: {
        name: 'AbnormalEndDate',
      },
    },
    abnormalType: {
      // 異常狀態
      // 1. 相機故障 (空拍過多); 2. 相機故障 (沒影像); 3. 相繼失竊 4. 相機電量好所過快 5. 其他
      type: String,
      default: AbnormalType.others,
      enum: AbnormalType.all(),
      required: true,
      index: {
        name: 'AbnormalType',
      },
    },
    note: {
      // 註解
      type: String,
    },
  },
  {
    collection: 'AbnormalCameraLocation',
  },
);
const model = mongoose.model('AbnormalCameraLocationModel', schema);

model.prototype.dump = function() {
  const doc = {
    id: `${this._id}`,
    cameraLocation: this.cameraLocation,
    studyArea: this.studyArea,
    studySubarea: this.studySubarea,
    abnormalStartDate: this.abnormalStartDate,
    abnormalEndDate: this.abnormalEndDate,
    abnormalType: this.abnormalType,
    note: this.note,
  };

  return doc;
};

module.exports = model;
