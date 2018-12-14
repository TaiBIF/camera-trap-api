const p = require('../package.json');

// for development using local db, if exists.
if (process.env.NODE_ENV === 'local') {
  try {
    const datasources = require('./datasources.local.json');
    console.log(`Using local data source at ${datasources.ctMongoDb40.url}`);
  } catch (err) {
    console.log('Local data sources settings not found.');
    console.log(err.code);
  }
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
