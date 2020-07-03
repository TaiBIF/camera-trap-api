const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

module.exports = (filename, dirname) => {
  console.log('extract', filename, dirname);
  return new Promise((resolve, reject) => {
    extract(
      filename,
      {
        dir: dirname,
        onEntry: (entry, zipfile) => {
          zipfile.once('end', () => {
            console.log('aoeu----', entry.fileName);
            fs.utimesSync(
              path.join(dirname, entry.fileName),
              entry.getLastModDate(),
              entry.getLastModDate(),
            );
          });
        },
      },
      error => {
        if (error) {
          return reject(error);
        }
        console.log('');
        resolve();
      },
    );
  });
};
