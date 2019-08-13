const { ERROR_MAP, ERROR, HTTP_STATUS } = require('./errors-code');

// 1
exports.Http400 = class Http400 extends Error {
  constructor(
    { message, statusCode = ERROR.FORMAT_INVALID } = {
      statusCode: ERROR.FORMAT_INVALID,
    },
  ) {
    super(message);
    this.status = 400;
    this.message = `${message || 'bad request'}`;
    this.code = ERROR_MAP[HTTP_STATUS.BAD_REQUEST][statusCode].code;
  }
};

exports.Http401 = class Http401 extends Error {
  constructor(
    { message, statusCode = ERROR.UNAUTHORIZED } = {
      statusCode: ERROR.UNAUTHORIZED,
    },
  ) {
    super(message);
    this.status = 401;
    this.message = `${message || 'unauthorized'}`;
    this.code = ERROR_MAP[HTTP_STATUS.UNAUTHORIZED][statusCode].code;
  }
};

exports.Http403 = class Http403 extends Error {
  constructor(
    { message, statusCode = ERROR.PERMISSION_DENIED } = {
      statusCode: ERROR.PERMISSION_DENIED,
    },
  ) {
    super(message);
    this.status = 403;
    this.message = `${message || 'permission denied'}`;
    this.code = ERROR_MAP[HTTP_STATUS.FORBIDDEN][statusCode].code;
  }
};

exports.Http404 = class Http404 extends Error {
  constructor(
    { message, statusCode = ERROR.DATA_NOT_FOUND } = {
      statusCode: ERROR.DATA_NOT_FOUND,
    },
  ) {
    super(message);
    this.status = 404;
    this.message = `${message || 'not found'}`;
    this.code = ERROR_MAP[HTTP_STATUS.NOT_FOUND][statusCode].code;
  }
};

exports.Http500 = class Http500 extends Error {
  /*
  Server error.
   */
  constructor(
    { message, statusCode = ERROR.INTERNAL_SERVER_ERROR } = {
      statusCode: ERROR.INTERNAL_SERVER_ERROR,
    },
  ) {
    super(message);
    this.status = 500;
    this.message = `${message || 'server error'}`;
    this.code = ERROR_MAP[HTTP_STATUS.INTERNAL_SERVER_ERROR][statusCode].code;
  }
};

// approach 2
exports.HttpStatusError = class HttpStatusError extends Error {
  constructor(
    {
      message,
      status = HTTP_STATUS.DEFAULT,
      errorMap = ERROR.DEFAULT_STATUS,
    } = {
      status: HTTP_STATUS.DEFAULT,
      errorMap: ERROR.DEFAULT_STATUS,
    },
  ) {
    super();
    this.status = status;
    this.message = `${message || ERROR_MAP[status][errorMap].message}`;
    this.code = ERROR_MAP[status][errorMap].code;
  }
};
