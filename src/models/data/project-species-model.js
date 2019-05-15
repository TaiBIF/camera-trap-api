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
    species: {
      type: Schema.ObjectId,
      ref: 'SpeciesModel',
      required: true,
      index: {
        name: 'Species',
      },
    },
    index: {
      // 排序 (由小到大)
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'ProjectSpecies',
  },
);

schema.method('dump', function() {
  return {
    id: `${this.species._id}`,
    title: this.species.title,
    code: this.species.code,
    index: this.index,
  };
});

module.exports = mongoose.model('ProjectSpeciesModel', schema);
