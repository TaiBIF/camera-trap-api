const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AbnormalityType = require('../const/abnormality-type');

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
    abnormalityStartDate: {
      // 異常資料時間 (開始)
      type: Date,
      required: true,
      index: {
        name: 'AbnormalityStartDate',
      },
    },
    abnormalityEndDate: {
      // 異常資料時間 (結束)
      type: Date,
      required: true,
      index: {
        name: 'AbnormalityEndDate',
      },
    },
    abnormalityType: {
      // 異常狀態
      // 1. 相機故障 (空拍過多); 2. 相機故障 (沒影像); 3. 相繼失竊 4. 相機電量好所過快 5. 其他
      type: String,
      default: AbnormalityType.others,
      enum: AbnormalityType.all(),
      required: true,
      index: {
        name: 'AbnormalityType',
      },
    },
    note: {
      // 註解
      type: String,
    },
  },
  {
    collection: 'CameraLocationAbnormality',
  },
);
const model = mongoose.model('CameraLocationAbnormalityModel', schema);

model.prototype.dump = function() {
  const doc = {
    id: `${this._id}`,
    cameraLocation: this.cameraLocation,
    abnormalityStartDate: this.abnormalityStartDate,
    abnormalityEndDate: this.abnormalityEndDate,
    abnormalityType: this.abnormalityType,
    note: this.note,
  };

  return doc;
};

module.exports = model;
