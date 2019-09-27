const mongoose = require('mongoose');
const utils = require('../../common/utils');

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
    sn: {
      type: String,
      required: true,
      index: {
        name: 'sn',
      },
    },
    date: {
      // 行程日期
      type: Date,
      required: true,
      index: {
        name: 'date',
      },
    },
    member: {
      // 行程人員
      type: String,
      required: true,
    },
    studyAreas: [
      {
        // 行程樣區
        title: {
          type: String,
        },
        studyArea: {
          type: Schema.ObjectId,
        },
        cameraLocations: [
          {
            cameraLocation: {
              type: Schema.ObjectId,
            },
            cameraLocationMark: {
              type: String,
            },
            projectCameras: [
              {
                cameraSn: {
                  type: String,
                },
                cameraBatteryType: {
                  type: String,
                },
                // 電池剩餘電量
                cameraBatteryRemainingCapacity: {
                  type: String,
                },
                cameraBrightness: {
                  type: String,
                },
                cameraSensitivity: {
                  type: String,
                },
                cameraVideoLength: {
                  type: Number,
                },
                cameraContinuousShots: {
                  type: Number,
                },
                cameraSensingDistance: {
                  type: Number,
                },
                cameraState: {
                  type: String,
                },
                // 相機註記
                cameraMark: {
                  type: String,
                },
                // 記憶卡檔案數
                cameraMemoryCardNumber: {
                  type: Number,
                },
                // 相機方位
                cameraPosition: {
                  type: String,
                },
                // 相機俯角
                cameraDepressionAngle: {
                  type: String,
                },
                // 感應距離
                sensingDistance: {
                  type: String,
                },
                // 有效開始時間
                startActiveDate: {
                  type: Date,
                },
                endActiveDate: {
                  type: Date,
                },
              },
            ],
          },
        ],
      },
    ],
    mark: {
      type: String,
    },
  },
  {
    collection: 'ProjectTrips',
  },
);
schema.index(
  { project: 1, sn: 1, date: '2019' },
  {
    name: 'ProjectTrips',
    background: true,
    unique: true,
  },
);

schema.method('dump', function() {
  return {
    id: `${this._id}`,
    project:
      this.project && typeof this.project.dump === 'function'
        ? this.project.dump()
        : this.project,
    sn: this.sn,
    date: this.date,
    member: this.member,
    studyAreas: this.studyAreas,
  };
});

module.exports = mongoose.model('ProjectTripModel', schema);
