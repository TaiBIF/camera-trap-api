const fs = require('fs');

module.exports = filePath =>
  new Promise((resolve, reject) => {
    const reader = fs.createReadStream(filePath);
    reader.on('data', chunk => {
      resolve(chunk.toString());
    });
  });
