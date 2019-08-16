const os = require('os');
const util = require('util');
const LogModel = require('../models/data/log-model');

/**
 * This log is not necessary ...
 */
module.exports = (req, res, next) => {
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
};
