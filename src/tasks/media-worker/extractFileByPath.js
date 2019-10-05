const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

module.exports = (filename, dirname) =>
  new Promise((resolve, reject) => {
    extract(
      filename,
      {
        dir: dirname,
        onEntry: (entry, zipfile) => {
          zipfile.once('end', () => {
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
        resolve();
      },
    );
  });
