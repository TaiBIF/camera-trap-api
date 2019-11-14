const mongoose = require('mongoose');
const utils = require('../../common/utils');

const { Schema } = mongoose;
utils.connectDatabase();
const schema = utils.generateSchema(
  {
    project: {
      // 計畫
      type: Schema.ObjectId,
      required: true,
      ref: 'ProjectModel',
      index: {
        name: 'Project',
      },
    },
    funder: {
      // 委辦單位
      type: String,
    },
    county: {
      // 城市
      type: String,
    },
    studyArea: {
      // 樣區
      type: Schema.ObjectId,
      required: true,
      ref: 'StudyAreaModel',
      index: {
        name: 'StudyArea',
      },
    },
    cameraLocation: {
      // 相機位置
      detail: {
        type: Schema.ObjectId,
        ref: 'CameraLocationModel',
        required: true,
        index: {
          name: 'CameraLocation',
        },
      },
      createTime: {
        type: Date,
      },
    },
    species: {
      // 物種
      type: Schema.ObjectId,
      ref: 'SpeciesModel',
      index: {
        name: 'Species',
      },
    },
    picture: {
      // 照片
      fileName: {
        // 名稱
        type: String,
      },
      size: {
        // 容量
        type: Number,
      },
      createTime: {
        type: Date,
      },
    },
  },
  {
    collection: 'Statistic',
  },
);

const model = mongoose.model('StatisticModel', schema);
module.exports = model;
