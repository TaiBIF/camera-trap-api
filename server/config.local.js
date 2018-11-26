const p = require('../package.json');
const datasources = require('./datasources.local.json');

const [major, minor] = p.version.split('.');
const version = `${major}.${minor}`;

console.log('Datasource using %s', datasources.ctMongoDb40.url);

module.exports = {
  // restApiRoot: '/api' + (version > 0 ? '/v' + version : ''),
  restApiRoot: `/v${version}`,
  baseRestApiRoot: '/',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
};
