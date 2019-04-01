const http = require('http');
const os = require('os');
const util = require('util');
const config = require('config');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const nocache = require('nocache');
const errors = require('./models/errors');
const authentication = require('./auth/authentication');
const webRouter = require('./routers/web-router');
const LogModel = require('./models/data/log-model');

const app = express();
const server = http.createServer(app);

// hide x-powered-by
app.locals.settings['x-powered-by'] = false;
// disable ETag at headers
app.disable('etag');
if (!config.isDebug) {
  app.enable('trust proxy');
}

app.use((req, res, next) => {
  // add req.startTime
  req.startTime = new Date();
  if (config.isDebug) {
    // append end hook
    const originEndFunc = res.end;
    res.end = function() {
      // eslint-disable-next-line prefer-rest-params
      const result = originEndFunc.apply(this, arguments);
      console.log(
        `[${res.statusCode}] ${`${req.method}      `.substr(0, 6)} ${
          req.originalUrl
        }`,
      );
      if (res.error) {
        console.error(res.error.stack);
      }
      return result;
    };
  }
  next();
});

app.use(cookieParser()); // setup req.cookies
app.use(bodyParser.json()); // setup req.body
app.use(
  session(
    util._extend(
      {
        store: new MongoStore(config.sessionStoreOptions),
      },
      config.sessionOptions,
    ),
  ),
);

app.use(authentication.session);

// write log
if (config.enableLog) {
  app.use((req, res, next) => {
    const originEndFunc = res.end;
    const log = new LogModel({
      hostname: os.hostname(),
      user: req.user.isLogin() ? req.user : undefined,
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      headers: (() => {
        if (req.headers && typeof req.body === 'object') {
          const headers = util._extend({}, req.headers);
          delete headers.cookie; // Don't log user's cookie.
          return JSON.stringify(headers);
        }
      })(),
      requestBody: (() => {
        if (req.body && typeof req.body === 'object') {
          return JSON.stringify(req.body);
        }
      })(),
      createTime: req.startTime,
    });
    const logPromise = log.save();
    res.end = function() {
      // eslint-disable-next-line prefer-rest-params
      const result = originEndFunc.apply(this, arguments);
      const now = new Date();
      logPromise.then(() => {
        log.processTime = now - req.startTime;
        log.responseStatus = res.statusCode;
        log.errorStack = res.error ? res.error.stack : undefined;
        return log.save();
      });
      return result;
    };
    next();
  });
}

app.use(nocache());
app.use('/api/v1', cors(config.corsOptions), webRouter.api);
app.use('/callback', webRouter.callback);

// error handler
app.use((req, res, next) => {
  // Didn't match any routers.
  next(new errors.Http404());
});
app.use((error, req, res, next) => {
  error.status = error.status || 500;
  res.status(error.status);
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
