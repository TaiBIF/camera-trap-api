const fs = require('fs');
const path = require('path');

const models = [];
fs.readdirSync(__dirname).forEach(file => {
  if (file.toLowerCase() === 'index.js') {
    return;
  }
  if (file.indexOf('.') === 0) {
    return;
  }
  // eslint-disable-next-line import/no-dynamic-require
  models.push(require(`.${path.sep}${file}`));
});

exports.allModels = models;
