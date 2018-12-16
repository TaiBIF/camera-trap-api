const p = require('../package.json');

const [major, minor] = p.version.split('.');
const version = `${major}.${minor}`;

module.exports = {
  restApiRoot: `/v${version}`,
  baseRestApiRoot: '/',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
};
