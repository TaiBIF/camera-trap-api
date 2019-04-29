const http = require('http');
const config = require('config');
const app = require('./web');

// launch server
const server = http.createServer(app);

module.exports = server.listen(config.server.port, config.server.host, () => {
  const { address, port } = server.address();
  console.log(`Server listening at http://${address}:${port}`);
});
