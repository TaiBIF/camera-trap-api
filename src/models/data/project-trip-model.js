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
        studyAreaId: {
          type: Schema.ObjectId,
        },
        cameraLocations: [
          {
            cameraLocationId: {
              type: Schema.ObjectId,
            },
            cameraLocationMark: {
              type: String,
            },
            projectCameras: {
              type: Array,
            },
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
