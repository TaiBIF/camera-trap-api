const os = require('os');
const util = require('util');
const AWS = require('aws-sdk');
const config = require('config');
const gm = require('gm'); // this module require graphicsmagick
const mime = require('mime-types');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const FileType = require('../models/const/file-type');

const s3 = new AWS.S3({
  accessKeyId: config.s3.key,
  secretAccessKey: config.s3.secret,
  region: config.s3.region,
});

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
  @returns {string|undefined}
   */
  if (FileType.all().indexOf(fileType) < 0) {
    throw new Error('Error file type.');
  }
  if (!filename) {
    return;
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

exports.calculateNewSizeWhenOversize = (
  size,
  maxWidth,
  maxHeight,
  isAllowExceeded = false,
) => {
  /*
  @param size {Object} The image size.
  @returns {Object|null}
    width: {Number}
    height: {Number}
   */
  const widthOverRatio = size.width / maxWidth;
  const heightOverRatio = size.height / maxHeight;

  if (widthOverRatio <= 1 && heightOverRatio <= 1) {
    // The image does not over size.
    return null;
  }
  if (isAllowExceeded) {
    if (widthOverRatio < heightOverRatio) {
      // Resize the width to the new width
      return {
        width: maxWidth,
        height: Math.round(size.height * (maxWidth / size.width)),
      };
    }
    // widthOverRatio >= heightOverRatio
    // Resize the height to the new height
    return {
      width: Math.round(size.width * (maxHeight / size.height)),
      height: maxHeight,
    };
  }
  // isAllowExceeded = false
  if (widthOverRatio > heightOverRatio) {
    // Resize the width to the new width
    return {
      width: maxWidth,
      height: Math.round(size.height * (maxWidth / size.width)),
    };
  }
  // widthOverRatio <= heightOverRatio
  // Resize the height to the new height
  return {
    width: Math.round(size.width * (maxHeight / size.height)),
    height: maxHeight,
  };
};

exports.resize = (buffer, width, height, isFillUp = true) =>
  /*
  @param buffer {Buffer}
  @param width {Number}
  @param height {Number}
  @param isFillUp {bool}
    true: Resize then crop the image.
    false: Resize the image and be smaller than the size.
  @returns {Promise<Object>}
    gm: {gm}
    width: {Number}
    height: {Number}
   */
  new Promise((resolve, reject) => {
    gm(buffer).size({ bufferStream: true }, function(error, size) {
      if (error) {
        return reject(error);
      }
      if (isFillUp) {
        const newSize = exports.calculateNewSizeWhenOversize(
          size,
          width,
          height,
          isFillUp,
        );
        if (newSize) {
          this.resize(newSize.width, newSize.height, '!');
          this.gravity('Center');
          this.crop(width, height);
          resolve({
            gm: this,
            width,
            height,
          });
        }
      } else {
        const newSize = exports.calculateNewSizeWhenOversize(
          size,
          width,
          height,
          isFillUp,
        );
        if (newSize) {
          this.resize(newSize.width, newSize.height, '!');
          resolve({
            gm: this,
            width: newSize.width,
            height: newSize.height,
          });
        }
      }
    });
  });

exports.uploadToS3 = (buffer, filename, isPublic) =>
  /*
  Upload the image to storage.
  @param buffer {Buffer}
  @param filename {string} The file name with path.
  @param isPublic {bool}
  @returns {Promise<Buffer>}
   */
  new Promise((resolve, reject) => {
    // upload to S3
    const params = {
      Bucket: config.s3.bucket,
      Key: filename,
      Body: buffer,
      ACL: isPublic ? 'public-read' : undefined,
      ContentType: mime.lookup(filename),
      CacheControl: 'max-age=31536000', // 365days
    };
    s3.upload(params, error_ => {
      if (error_) {
        return reject(error_);
      }
      resolve(buffer);
    });
  });

exports.deleteS3Objects = (filenames = []) =>
  /*
  Delete objects on S3.
  @param filenames {Array<string>}
  @returns {Promise<>}
   */
  new Promise((resolve, reject) => {
    const params = {
      Bucket: config.s3.bucket,
      Delete: {
        Objects: filenames.map(filename => ({ Key: filename })),
      },
    };
    s3.deleteObjects(params, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });

exports.resizeImageAndUploadToS3 = (args = {}) => {
  /*
  Resize and upload the image to storage.
  @param args {object}
    buffer {Buffer|gm}
    filename {string} The file name with path.
    format {string} "jpg|png|gif"
    width {Number}
    height {Number}
    quality {Number|null} The image quality. The default is 86.
    isFillUp {bool}
    isPublic {bool}
  @returns {Promise<object>}
    buffer: {Buffer}
    width: {int}
    height: {int}
   */
  args.quality = args.quality || 86;
  return exports
    .resize(args.buffer, args.width, args.height, args.isFillUp)
    .then(
      result =>
        new Promise((resolve, reject) => {
          result.gm.noProfile();
          result.gm
            .quality(args.quality)
            .toBuffer(args.format, (error, buffer) => {
              if (error) {
                return reject(error);
              }
              Promise.all([result, exports.uploadToS3(buffer, args.filename)])
                .then(results => resolve(results))
                .catch(errors => reject(errors));
            });
        }),
    )
    .then(([result, buffer]) => ({
      buffer,
      width: result.width,
      height: result.height,
    }));
};

exports.getAnonymous = () => ({ isLogin: () => false });

exports.logError = (error, extra) => {
  /*
  @param error {Error}
  @param extra {Object}
   */
  const LogModel = require('../models/data/log-model');
  if (config.isDebug) {
    console.error(error);
  }
  if (!config.enableLog) {
    return;
  }
  const log = new LogModel({
    server: os.hostname(),
    errorStack: error ? error.stack : undefined,
    extra: (() => {
      try {
        let result;
        if (extra) {
          result = JSON.stringify(extra);
        }
        return result;
      } catch (e) {
        /* empty */
      }
    })(),
  });
  log.save();
};
