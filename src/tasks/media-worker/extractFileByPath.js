const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

module.exports = async (filename, dirname) => {
  const fileList = [];
  await extract(
    filename,
    {
      dir: dirname,
      onEntry: (entry, zipfile) => {
        zipfile.once('end', () => {
          fileList.push(path.join(dirname, entry.fileName));
          fs.utimesSync(
            path.join(dirname, entry.fileName),
            entry.getLastModDate(),
            entry.getLastModDate(),
          );
        });
      },
    },
    error => {
      console.log(error);
    },
  );
  return fileList;
};
