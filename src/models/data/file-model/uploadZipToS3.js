const fs = require('fs');
const { s3 } = require('config');
const moment = require('moment');
const utils = require('../../../common/utils');
const logger = require('../../../logger');

module.exports = async (source, filename) => {
  const startTime = moment();
  logger.info(`Upload zip start - [${filename}]`);
  return new Promise((resolve, reject) => {
    utils
      .uploadToS3({
        Key: `${s3.folders.annotationZIPs}/${filename}`,
        Body: typeof source === 'string' ? fs.createReadStream(source) : source,
        StorageClass: 'STANDARD_IA',
      })
      .then(() => {
        const spendTime = moment().to(startTime, true);
        logger.info(`Upload zip end - [${filename}] time: ${spendTime}`);
        resolve(this);
      })
      .catch(e => {
        console.log('------------------------');
        console.log(e);
        logger.info(`Upload zip fail - [${filename}]`);
        reject(e);
      });
  });
};
