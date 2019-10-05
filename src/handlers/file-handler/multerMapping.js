const multer = require('multer');
const util = require('util');
const config = require('config');
const FileType = require('../../models/const/file-type');

const multers = {
  image: util.promisify(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: config.limit.imageFileSize },
    }).single('file'),
  ),
  video: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.videoFileSize },
    }).single('file'),
  ),
  csv: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.csvFileSize },
    }).single('file'),
  ),
  zip: util.promisify(
    multer({
      storage: multer.diskStorage({}),
      limits: { fileSize: config.limit.zipFileSize },
    }).single('file'),
  ),
  issueAttachment: util.promisify(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: config.limit.issueAttachmentSize },
    }).single('file'),
  ),
};

const multerTable = {};
multerTable[FileType.projectCoverImage] = multers.image;
multerTable[FileType.annotationImage] = multers.image;
multerTable[FileType.annotationVideo] = multers.video;
multerTable[FileType.annotationCSV] = multers.csv;
multerTable[FileType.annotationZIP] = multers.zip;
multerTable[FileType.issueAttachment] = multers.issueAttachment;

module.exports = multerTable;
