const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const CameraLocationState = require('../const/camera-location-state');

const db = utils.getDatabaseConnection();
const model = db.model(
  'CameraLocationModel',
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
      },
      longitude: {
        // 經度 (WGS84)
        type: Number,
      },
      altitude: {
        // 海拔（公尺）
        type: Number,
      },
      vegetation: {
        // 植被
        // todo: i18n
        type: String,
      },
    },
    {
      collection: 'CameraLocations',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    name: this.name,
    settingTime: this.settingTime,
    latitude: this.latitude,
    longitude: this.longitude,
    altitude: this.altitude,
    vegetation: this.vegetation,
  };
};

module.exports = model;
