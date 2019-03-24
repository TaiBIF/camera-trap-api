const path = require('path');
const config = require('config');
const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const FileType = require('../const/file-type');

const db = utils.getDatabaseConnection();
const schema = utils.generateSchema(
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
);
schema.post('remove', file => {
  if (file.type === FileType.projectCoverImage) {
    utils
      .deleteS3Objects([
        `${config.s3.folders.projectCovers}/${file.getFilename()}`,
      ])
      .catch(error => {
        utils.logError(error, { file: file.dump() });
      });
  }
});
const model = db.model('FileModel', schema);

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

model.prototype.saveWithContent = function(buffer) {
  /*
  Save the document with binary content.
  @param buffer {Buffer}
  @returns {Promise<FileModel>}
   */
  return this.save().then(() => {
    if (this.type === FileType.projectCoverImage) {
      return utils
        .resizeImageAndUploadToS3({
          buffer,
          filename: `${config.s3.folders.projectCovers}/${this.getFilename()}`,
          format: this.getExtensionName(),
          width: 383,
          height: 185,
          isPublic: true,
        })
        .then(result => {
          this.size = result.buffer.length;
          return this.save();
        });
    }
  });
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
