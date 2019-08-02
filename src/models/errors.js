const { ERROR_MAP, ERROR } = require('./errors-code');

// 1
exports.Http400 = class Http400 extends Error {
  constructor(
    { message, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = 400;
    this.message = `${message || 'bad request'}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};

exports.Http401 = class Http401 extends Error {
  constructor(
    { message, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = 401;
    this.message = `${message || 'unauthorized'}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};

exports.Http403 = class Http403 extends Error {
  constructor(
    { message, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = 403;
    this.message = `${message || 'permission denied'}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};

exports.Http404 = class Http404 extends Error {
  constructor(
    { message, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = 404;
    this.message = `${message || 'not found'}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};

exports.Http500 = class Http500 extends Error {
  /*
  Server error.
   */
  constructor(
    { message, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = 500;
    this.message = `${message || 'server error'}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};

// approach 2
exports.HttpError = class HttpError extends Error {
  constructor(
    { message, status, statusCode } = {
      statusCode: ERROR.DEFAULT_STATUSCODE,
    },
  ) {
    super(message);
    this.status = status || ERROR_MAP[statusCode].status;
    this.message = `${message || ERROR_MAP[statusCode].message}`;
    this.code = ERROR_MAP[statusCode].code;
  }
};
