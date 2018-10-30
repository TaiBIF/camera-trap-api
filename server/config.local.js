let p = require('../package.json');
let version_splits = p.version.split('.');
let version = version_splits[0] + '.' + version_splits[1];
module.exports = {
  // restApiRoot: '/api' + (version > 0 ? '/v' + version : ''),
  restApiRoot: '/api' + '/v' + version,
  baseRestApiRoot: '/api',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000
};
