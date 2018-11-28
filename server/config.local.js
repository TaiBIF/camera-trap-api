const fs = require('fs');
const p = require('../package.json');

// for development using local db, if exists.
if (process.env.NODE_ENV === 'local') {
  fs.stat('./datasources.local.json', err => {
    if (!err) {
      const datasources = require('./datasources.local.json');
      console.log('Data source using %s', datasources.ctMongoDb40.url);
    } else if (err.code === 'ENOENT') {
      // do nothing yet.
    }
  });
}

const [major, minor] = p.version.split('.');
const version = `${major}.${minor}`;

module.exports = {
  // restApiRoot: '/api' + (version > 0 ? '/v' + version : ''),
  restApiRoot: `/v${version}`,
  baseRestApiRoot: '/',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
};
