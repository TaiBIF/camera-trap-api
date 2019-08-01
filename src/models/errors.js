const { ERROR_MAP } = require('./errors-code');

// 1
exports.Http400 = class Http400 extends Error {
  constructor({ message, statusCode } = {}) {
    super(message);
    this.status = 400;
    this.message = `${message || 'bad request'}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};

exports.Http401 = class Http401 extends Error {
  constructor({ message, statusCode } = {}) {
    super(message);
    this.status = 401;
    this.message = `${message || 'unauthorized'}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};

exports.Http403 = class Http403 extends Error {
  constructor({ message, statusCode } = {}) {
    super(message);
    this.status = 403;
    this.message = `${message || 'permission denied'}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};

exports.Http404 = class Http404 extends Error {
  constructor({ message, statusCode } = {}) {
    super(message);
    this.status = 404;
    this.message = `${message || 'not found'}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};

exports.Http500 = class Http500 extends Error {
  /*
  Server error.
   */
  constructor({ message, statusCode } = {}) {
    super(message);
    this.status = 500;
    this.message = `${message || 'server error'}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};

// 2
exports.HttpError = class HttpError extends Error {
  constructor({ message, status, statusCode } = {}) {
    super(message);
    this.status = status || 507;
    this.message = statusCode
      ? `${message || ERROR_MAP[statusCode].message}`
      : `${message}`;
    this.code = statusCode
      ? ERROR_MAP[statusCode].code
      : ERROR_MAP.DEFAULT_STATUSCODE.code;
  }
};
