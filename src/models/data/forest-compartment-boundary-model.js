const mongoose = require('mongoose');
const utils = require('../../common/utils');

// const { Schema } = mongoose;
utils.connectDatabase();

const schema = utils.generateSchema(
  {
    type: {
      type: String,
      required: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    properties: {
      Name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      altitudeMode: {
        type: String,
      },
      CMPT: {
        type: String,
      },
      AREA: {
        type: String,
      },
      WKNG: {
        type: String,
      },
      DIST_C: {
        type: String,
      },
      DIST: {
        type: String,
      },
      Field_1: {
        type: String,
      },
      WKNG_C: {
        type: String,
      },
    },
    id: {
      type: Number,
      required: true,
    },
  },
  {
    collection: 'ForestCompartmentBoundary',
  },
);

const model = mongoose.model('ForestCompartmentBoundaryModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    geometry: this.geometry,
    properties: this.properties,
  };
};

module.exports = model;
