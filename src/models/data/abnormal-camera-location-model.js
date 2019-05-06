const _ = require('lodash');
const mongoose = require('mongoose');
const utils = require('../../common/utils');
const CameraLocationState = require('../const/camera-location-state');

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
    studyArea: {
      // 樣區
      type: Schema.ObjectId,
      ref: 'StudyAreaModel',
      required: true,
    },
    studySubarea: {
      // 子樣區
      type: Schema.ObjectId,
      ref: 'StudysSubareaModel',
      required: true,
    },
    name: {
      // 相機位置
      // index: UniqueName
      type: String,
      required: true,
      index: {
        name: 'Name',
      },
    },
    abnormalStartDate: {
      // 異常資料時間 (開始)
      type: Date,
      required: true,
    },
    abnormalEndDate: {
      // 異常資料時間 (結束)
      type: Date,
      required: true,
    },
    abnormalType: {
      // 異常狀態
      // 1. 相機故障 (空拍過多); 2. 相機故障 (沒影像); 3. 相繼失竊 4. 相機電量好所過快 5. 其他
      type: String,
      default: CameraLocationState.others,
      enum: CameraLocationState.all(),
      required: true,
      index: {
        name: 'abnormalType',
      },
    },
    remarks: {
      // 註解
      type: String,
    },
    lockExpiredTime: {
      // 編輯鎖定結束時間
      type: Date,
      index: {
        name: 'LockExpiredTime',
      },
    },
    lockUser: {
      // 進入編輯模式的使用者
      type: Schema.ObjectId,
      ref: 'UserModel',
    },
  },
  {
    collection: 'AbnormalCameraLocations',
  },
);
schema.index(
  {
    project: 1,
    name: 1,
  },
  {
    name: 'UniqueName',
    background: true,
    unique: true,
    partialFilterExpression: {
      state: CameraLocationState.active,
    },
  },
);

schema.method('isLocked', function() {
  /*
  Is this camera location locked?
  @returns {Boolean}
   */
  return !!(this.lockExpiredTime && this.lockExpiredTime > new Date());
});

const model = mongoose.model('CameraLocationModel', schema);

model.prototype.dump = function() {
  const isLocked = this.isLocked();
  let lockUser;

  if (isLocked) {
    lockUser =
      this.lockUser && typeof this.lockUser.dump === 'function'
        ? this.lockUser.dump()
        : this.lockUser;
  }
  const doc = {
    id: `${this._id}`,
    studyArea:
      this.studyArea && typeof this.studyArea.dump === 'function'
        ? this.studyArea.dump()
        : this.studyArea,
    studySubarea: this.studySubarea,
    name: this.name,
    abnormalStartDate: this.abnormalStartDate,
    abnormalEndDate: this.abnormalEndDate,
    abnormalType: this.abnormalType,
    remarks: this.remarks,
    isLocked,
    lockUser,
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
