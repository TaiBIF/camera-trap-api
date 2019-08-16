const leftPad = require('left-pad');
const logger = require('../logger');

module.exports = (req, res, next) => {
  // add req.startTime
  req.startTime = new Date();

  // append end hook
  const originEndFunc = res.end;
  res.end = function() {
    const { statusCode } = res;
    const { method, originalUrl: requestUrl, startTime } = req;

    // eslint-disable-next-line prefer-rest-params
    const result = originEndFunc.apply(this, arguments);
    const now = new Date();
    const processTime = `${now - startTime}`;
    const msTime = leftPad(
      processTime.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      7,
    );

    logger.info(`[${statusCode}] ${msTime}ms ${method}\t ${requestUrl}`);

    if (res.error) {
      logger.error(res.error.stack);
    }
    return result;
  };
  next();
};
