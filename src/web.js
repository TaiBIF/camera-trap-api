const http = require('http');
const config = require('config');
const express = require('express');
const webRouter = require('./routers/web-router');

const app = express();
const server = http.createServer(app);

app.use('/api/v1', webRouter);

// launch server
server.listen(config.server.port, config.server.host, () => {
  const address = server.address();
  console.log(`Server listening at http://${address.address}:${address.port}`);
});
