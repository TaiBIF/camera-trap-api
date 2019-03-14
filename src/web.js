const http = require('http');
const config = require('config');
const express = require('express');
const utils = require('./common/utils');

const app = express();
const server = http.createServer(app);

global.db = utils.getDatabaseConnection(); // This is for handlers.

// launch server
server.listen(config.server.port, config.server.host, () => {
  const address = server.address();
  console.log(`Server listening at http://${address.address}:${address.port}`);
});
