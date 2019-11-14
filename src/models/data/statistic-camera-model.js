const mongoose = require('mongoose');
const utils = require('../../common/utils');

const { Schema } = mongoose;
utils.connectDatabase();
const schema = utils.generateSchema(
  {
    county: {
      // 城市
      type: String,
    },
    trip: {
      // 行程
      type: Schema.ObjectId,
      ref: 'ProjectTripModel',
      index: {
        name: 'Trip',
      },
    },
    camera: {
      // 相機
      _id: {
        type: Schema.ObjectId,
      },
      sn: {
        // 序號
        type: String,
      },
      workHour: {
        // 工時
        type: Number,
      },
    },
  },
  {
    collection: 'StatisticCamera',
  },
);

const model = mongoose.model('StatisticCameraModel', schema);
module.exports = model;
