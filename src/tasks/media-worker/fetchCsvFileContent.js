const fs = require('fs');
const iconv = require('iconv-lite');
const detectCharacterEncoding = require('detect-character-encoding');
const logger = require('../../logger');

module.exports = filePath =>
  new Promise((resolve, reject) => {
    const { encoding } = detectCharacterEncoding(fs.readFileSync(filePath));
    let reader;
    if (encoding === 'Big5') {
      reader = fs.createReadStream(filePath).pipe(iconv.decodeStream('big5'));
      logger.info('decode Big5 to UTF8');
    } else {
      reader = fs.createReadStream(filePath);
    }

    reader.on('data', chunk => {
      resolve(chunk.toString());
    });
  });
