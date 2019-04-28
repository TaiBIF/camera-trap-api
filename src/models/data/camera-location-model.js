const _ = require('lodash');
const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AnnotationState = require('../const/annotation-state');
const CameraLocationState = require('../const/camera-location-state');
const AnnotationModel = require('./annotation-model');

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
    state: {
      // 狀態
      // 相機使用軟刪除，因為報表須提供「相機撤除」的資料
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
    latitude: {
      // 緯度 (WGS84)
      type: Number,
      required: true,
    },
    longitude: {
      // 經度 (WGS84)
      type: Number,
      required: true,
    },
    altitude: {
      // 海拔（公尺）
      type: Number,
    },
    vegetation: {
      // 植被
      type: String,
    },
    landCover: {
      // 土地覆蓋類型
      type: String,
    },
  },
  {
    collection: 'CameraLocations',
  },
);
schema.index(
  { project: 1, name: 1 },
  {
    name: 'UniqueName',
    background: true,
    unique: true,
    partialFilterExpression: {
      state: CameraLocationState.active,
    },
  },
);

schema.static('checkCanTrash', async docs => {
  const cameraLocationIds = _.map(docs, '_id');
  const notRemovedAnnotation = { state: { $ne: AnnotationState.removed } };
  const annotations = await AnnotationModel.find(notRemovedAnnotation)
    .where('cameraLocation')
    .in(cameraLocationIds);

  return docs.map(cameraLocation => {
    cameraLocation.canTrash = !!_.find(annotations, {
      cameraLocation: cameraLocation._id,
    });
    return cameraLocation;
  });
});

const model = mongoose.model('CameraLocationModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    studyArea:
      this.studyArea && typeof this.studyArea.dump === 'function'
        ? this.studyArea.dump()
        : this.studyArea,
    name: this.name,
    settingTime: this.settingTime,
    latitude: this.latitude,
    longitude: this.longitude,
    altitude: this.altitude,
    vegetation: this.vegetation,
    landCover: this.landCover,
    canTrash: !!this.canTrash,
  };
};

module.exports = model;
