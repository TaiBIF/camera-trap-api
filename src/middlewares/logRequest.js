const leftPad = require('left-pad');
const logger = require('../logger');

module.exports = (req, res, next) => {
  // add req.startTime
  req.startTime = new Date();

  // append end hook
  const originEndFunc = res.end;
  res.end = function() {
    // eslint-disable-next-line prefer-rest-params
    const result = originEndFunc.apply(this, arguments);
    const now = new Date();
    const processTime = `${now - req.startTime}`.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ',',
    );
    logger.info(
      `[${res.statusCode}] ${leftPad(processTime, 7)}ms ${`${
        req.method
      }      `.substr(0, 6)} ${req.originalUrl}`,
    );

    if (res.error) {
      logger.error(res.error.stack);
    }
    return result;
  };
  next();
};
