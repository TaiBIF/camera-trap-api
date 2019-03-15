const { Schema } = require('mongoose');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'ProjectCameraModel',
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
      site: {
        // 樣區
        type: Schema.ObjectId,
        ref: 'ProjectSiteModel',
        required: true,
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
        // 緯度
        type: Number,
      },
      longitude: {
        // 經度
        type: Number,
      },
      altitude: {
        // 海拔（公尺）
        type: Number,
      },
      vegetation: {
        // 植被
        // todo: i18n
        type: Schema,
      },
    },
    {
      collection: 'ProjectCameras',
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
