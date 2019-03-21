const http = require('http');
const config = require('config');
const express = require('express');
const nocache = require('nocache');
const errors = require('./models/errors');
const webRouter = require('./routers/web-router');

const app = express();
const server = http.createServer(app);

app.use(nocache());
app.use('/api/v1', webRouter);

// error handler
app.use((req, res, next) => {
  // Didn't match any routers.
  next(new errors.Http404());
});
app.use((error, req, res, next) => {
  error.status = error.status || 500;
  res.statusCode = error.status;
  res.error = error;
  res.json({
    message: error.message,
  });
});

// launch server
server.listen(config.server.port, config.server.host, () => {
  const { address, port } = server.address();
  console.log(`Server listening at http://${address}:${port}`);
});
