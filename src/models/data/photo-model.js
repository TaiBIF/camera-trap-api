const mongoose = require('mongoose');
const utils = require('../../common/utils');

utils.connectDatabase();
const model = mongoose.model(
  'PhotoModel',
  utils.generateSchema(
    {
      uri: {
        type: String,
      },
      name: {
        type: String,
      },
      file_extension: {
        type: String,
      },
    },
    {
      collection: 'Photos',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    uri: this.uri,
    name: this.name,
    file_extension: this.file_extension,
  };
};

module.exports = model;
