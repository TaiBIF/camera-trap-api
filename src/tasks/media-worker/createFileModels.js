const { keyBy } = require('lodash');
const Promise = require('bluebird');
const path = require('path');
const FileExtensionName = require('../../models/const/file-extension-name');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const logger = require('../../logger');

const saveConcurrency = 8;

module.exports = (files, dirname, project, user) =>
  new Promise((resolve, reject) => {
    Promise.resolve(files)
      .map(
        filename => {
          const fileObject = new FileModel({
            project,
            user,
            originalFilename: filename,
          });
          const fileExtensionName = fileObject.getExtensionName();

          if (FileExtensionName.annotationImage.includes(fileExtensionName)) {
            fileObject.type = FileType.annotationImage;
          } else if (
            FileExtensionName.annotationVideo.includes(fileExtensionName)
          ) {
            fileObject.type = FileType.annotationVideo;
          } else {
            return;
          }

          const source = path.join(dirname, filename);
          return fileObject.saveWithContent(source).catch(e => {
            // catch fail convert
            logger.error(`zip worker job. ${filename} failed, ${e.message}`);
          });
        },
        { concurrency: saveConcurrency },
      )
      .filter(object => !!object)
      .then(fileObjects =>
        resolve(keyBy(fileObjects, fileObject => fileObject.originalFilename)),
      )
      .catch(e => {
        logger.error(`zip worker job. ${e.message}`);
      });
  });
