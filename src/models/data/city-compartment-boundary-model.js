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
        enum: ['MultiPolygon'],
        required: true,
      },
      coordinates: {
        type: [[[[Number]]]],
        // required: true,
      },
    },
    properties: {
      name: {
        type: String,
        required: true,
      },
      scale: {
        type: Number,
      },
      areaCode: {
        type: String,
      },
    },
  },
  {
    collection: 'CityCompartmentBoundary',
  },
);

const model = mongoose.model('CityCompartmentBoundaryModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    geometry: this.geometry,
    properties: this.properties,
  };
};

module.exports = model;
