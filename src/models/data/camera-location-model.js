const _ = require('lodash');
const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AnnotationState = require('../const/annotation-state');
const CameraLocationState = require('../const/camera-location-state');
const GeodeticDatum = require('../const/geodetic-datum');

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
      index: {
        name: 'StudyArea',
      },
    },
    state: {
      // 狀態
      // 相機位置使用軟刪除，因為報表須提供「相機撤除」的資料
      type: String,
      default: CameraLocationState.active,
      enum: CameraLocationState.all(),
      index: {
        name: 'State',
      },
    },
    name: {
      // 相機位置名稱
      // index: UniqueName
      type: String,
      required: true,
      index: {
        name: 'Name',
      },
    },
    settingTime: {
      // 架設日期
      type: Date,
    },
    retireTime: {
      // 撤收日期
      type: Date,
    },
    latitude: {
      // 緯度
      type: Number,
      required: true,
    },
    longitude: {
      // 經度
      type: Number,
      required: true,
    },
    geodeticDatum: {
      // 大地基準
      type: String,
      required: true,
      default: GeodeticDatum.twd97,
      enum: GeodeticDatum.all(),
    },
    altitude: {
      // 海拔（公尺）
      type: Number,
    },
    vegetation: {
      // 植被類型
      type: String,
    },
    landCoverType: {
      // 土地覆蓋類型
      type: String,
    },
    verbatimLocality: {
      // 地點
      type: String,
    },
    remarks: {
      // Remarks 備註
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
    collection: 'CameraLocations',
  },
);
schema.index(
  { project: 1, studyArea: 1, 'studyArea.parent': 1, name: 1 },
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

schema.static('joinFailuresAndCanTrash', async docs => {
  const cameraLocationIds = _.map(docs, '_id');
  let result = await mongoose.model('AnnotationModel').aggregate([
    {
      $match: {
        cameraLocation: { $in: cameraLocationIds },
        state: { $in: [AnnotationState.active, AnnotationState.waitForReview] },
      },
    },
    {
      $group: {
        _id: '$cameraLocation',
        count: { $sum: 1 },
        failures: {
          $sum: { $cond: [{ $size: '$failures' }, 1, 0] },
        },
      },
    },
  ]);

  result = _.keyBy(result, '_id');

  return docs.map(doc => {
    doc.canTrash = result[doc._id] ? result[doc._id].count === 0 : true;
    doc.failures = result[doc._id] ? result[doc._id].failures : 0;
    return doc;
  });
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
    project:
      this.project && typeof this.project.dump === 'function'
        ? this.project.dump()
        : this.project,
    studyArea:
      this.studyArea && typeof this.studyArea.dump === 'function'
        ? this.studyArea.dump()
        : this.studyArea,
    name: this.name,
    settingTime: this.settingTime,
    retireTime: this.retireTime,
    latitude: this.latitude,
    longitude: this.longitude,
    geodeticDatum: this.geodeticDatum,
    altitude: this.altitude,
    vegetation: this.vegetation,
    landCoverType: this.landCoverType,
    verbatimLocality: this.verbatimLocality,
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
