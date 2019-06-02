const config = require('config');
const web = require('./web');

// launch server
const server = web(true);

module.exports = server.listen(config.server.port, config.server.host, () => {
  const { address, port } = server.address();
  console.log(`Server listening at http://${address}:${port}`);
});
