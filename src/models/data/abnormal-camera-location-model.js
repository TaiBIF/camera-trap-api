// const _ = require('lodash');
const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AbnormalType = require('../const/abnormal-type');

const { Schema } = mongoose;

utils.connectDatabase();

const schema = utils.generateSchema(
  {
    cameraLocationId: {
      // 相機位置 ID
      type: Schema.ObjectId,
      ref: 'CameraLocationModel',
      required: true,
      index: {
        name: 'CameraLocationId',
      },
    },
    // studyArea: {
    //   // 樣區
    //   type: Schema.ObjectId,
    //   ref: 'StudyAreaModel',
    //   required: true,
    // },
    // studySubarea: {
    //   // 子樣區
    //   type: Schema.ObjectId,
    //   ref: 'StudysSubareaModel',
    //   required: true,
    // },
    // name: {
    //   // 相機位置
    //   type: String,
    //   required: true,
    // },
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
        name: 'AbnormalEdnDate',
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
    remarks: {
      // 註解
      type: String,
      index: {
        name: 'Remarks',
      },
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
    cameraLocationId: this.cameraLocationId,
    abnormalStartDate: this.abnormalStartDate,
    abnormalEndDate: this.abnormalEndDate,
    abnormalType: this.abnormalType,
    remarks: this.remarks,
  };

  if (this.failures !== undefined) {
    doc.failures = this.failures;
  }
  if (this.canTrash !== undefined) {
    doc.canTrash = this.canTrash;
  }
  return doc;
};

module.exports = model;
