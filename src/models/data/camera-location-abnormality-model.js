const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AbnormalityType = require('../const/abnormality-type');

const { Schema } = mongoose;
utils.connectDatabase();

const schema = utils.generateSchema(
  {
    user: {
      // The user who added this entity.
      type: Schema.ObjectId,
      ref: 'UserModel',
      required: true,
    },
    project: {
      type: Schema.ObjectId,
      ref: 'ProjectModel',
      required: true,
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
    collection: 'CameraLocationAbnormalities',
  },
);

schema.method('dump', function() {
  return {
    id: `${this._id}`,
    user:
      this.user && typeof this.user.dump === 'function'
        ? this.user.dump()
        : this.user,
    project:
      this.project && typeof this.project.dump === 'function'
        ? this.project.dump()
        : this.project,
    cameraLocation:
      this.cameraLocation && typeof this.cameraLocation.dump === 'function'
        ? this.cameraLocation.dump()
        : this.cameraLocation,
    abnormalityStartDate: this.abnormalityStartDate,
    abnormalityEndDate: this.abnormalityEndDate,
    abnormalityType: this.abnormalityType,
    note: this.note,
  };
});

module.exports = mongoose.model('CameraLocationAbnormalityModel', schema);
