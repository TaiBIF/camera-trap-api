const util = require('util');
const config = require('config');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const FileType = require('../models/const/file-type');

let _db;
exports.getDatabaseConnection = (autoIndex = false) => {
  /*
  Get database connection.
  example: https://github.com/Automattic/mongoose/tree/master/examples/express
  @params autoIndex {bool}
  @returns {Connection}
   */
  if (_db) {
    return _db;
  }
  _db = mongoose.createConnection(config.database.url, {
    useNewUrlParser: true,
    autoIndex,
  });
  return _db;
};

exports.generateSchema = (model, options) => {
  /*
  Generate a instance of mongoose.Schema.
  @params model {Object}
  @params options {Object}  https://mongoosejs.com/docs/guide.html#options
  @return {mongoose.Schema}
   */
  const schema = new mongoose.Schema(
    util._extend(
      {
        createTime: {
          // 資料建立時間
          type: Date,
          default: Date.now,
          index: {
            name: 'CreateTime',
          },
        },
        updateTime: {
          // 資料修改時間
          type: Date,
          default: Date.now,
          index: {
            name: 'UpdateTime',
          },
        },
      },
      model,
    ),
    options,
  );
  schema.plugin(mongoosePaginate);
  schema.pre('save', function(next) {
    this.increment();
    this.updateTime = Date.now();
    next();
  });
  return schema;
};

exports.getFileUrl = (fileType, filename) => {
  /*
  Get the image url.
  @param fileType {string}
  @param filename {string}
  @returns {string}
   */
  if (FileType.all().indexOf(fileType) < 0) {
    throw new Error('Error file type.');
  }
  if (!filename) {
    return '';
  }
  const mapping = {};
  mapping[FileType.projectCoverImage] = config.s3.folders.projectCovers;
  mapping[FileType.annotationImage] = config.s3.folders.annotationImages;
  mapping[FileType.annotationVideo] = config.s3.folders.annotationVideos;
  mapping[FileType.annotationCSV] = config.s3.folders.annotationCSVs;
  mapping[FileType.annotationZIP] = config.s3.folders.annotationZIPs;
  mapping[FileType.issueAttachment] = config.s3.folders.issueAttachments;
  return `${config.s3.urlPrefix}${mapping[fileType]}/${filename}`;
};

exports.getAnonymous = () => ({ isLogin: () => false });
