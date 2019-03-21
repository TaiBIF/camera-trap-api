const path = require('path');
const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const FileType = require('../const/file-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'FileModel',
  utils.generateSchema(
    {
      type: {
        type: String,
        required: true,
        enum: FileType.all(),
        index: {
          name: 'Type',
        },
      },
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        index: {
          name: 'Project',
        },
      },
      user: {
        // The file owner.
        type: Schema.ObjectId,
        ref: 'UserModel',
        index: {
          name: 'User',
        },
      },
      originalFilename: {
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
      collection: 'Files',
    },
  ),
);

model.prototype.getExtensionName = function() {
  return path
    .extname(this.originalFilename)
    .replace('.', '')
    .toLowerCase();
};
model.prototype.getFilename = function() {
  /*
  Get the filename on S3.
  @returns {string}
   */
  return `${this._id}.${this.getExtensionName()}`;
};

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    originalFilename: this.originalFilename,
    filename: this.getFilename(),
    url: utils.getFileUrl(this.type, this.getFilename()),
    size: this.size,
  };
};

module.exports = model;
