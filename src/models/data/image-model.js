const path = require('path');
const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const ImageType = require('../const/image-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'ImageModel',
  utils.generateSchema(
    {
      type: {
        type: String,
        required: true,
        enum: ImageType.all(),
      },
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        index: {
          name: 'Project',
        },
      },
      user: {
        // The image owner.
        type: Schema.ObjectId,
        ref: 'UserModel',
        index: {
          name: 'User',
        },
      },
      originalName: {
        // The original filename.
        type: String,
        required: true,
      },
      size: {
        // The file size.
        type: Number,
      },
    },
    {
      collection: 'Images',
    },
  ),
);

model.prototype.getExtensionName = function() {
  return path
    .extname(this.originalName)
    .replace('.', '')
    .toLowerCase();
};
model.prototype.getFilename = function() {
  return `${this._id}.${this.getExtensionName()}`;
};

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    filename: this.getFilename(),
    url: utils.getImageUrl(this.type, this.getFilename()),
  };
};

module.exports = model;
