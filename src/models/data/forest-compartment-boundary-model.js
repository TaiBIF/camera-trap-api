const mongoose = require('mongoose');
const utils = require('../../common/utils');


const { Schema } = mongoose;
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
        required: true
      },
      coordinates: {
        type: [[[Number]]],
        required: true
      }
    },
    properties: {
      'Name': {
        type: String,
        required: true,
      },
      'description': {
        type: String,
      },
      'altitudeMode': {
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
  };
};

module.exports = model;
