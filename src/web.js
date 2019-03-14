const http = require('http');
const config = require('config');
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// create mongodb connection
// example: https://github.com/Automattic/mongoose/tree/master/examples/express
global.db = mongoose.createConnection(config.database.url, {
  useNewUrlParser: true,
});

// launch server
server.listen(config.server.port, config.server.host, () => {
  const address = server.address();
  console.log(`Server listening at http://${address.address}:${address.port}`);
});
