exports.ERROR = {
  FORMAT_INVALID: 'FORMAT_INVALID',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_EXISTED: 'DATA_EXISTED',
  DATA_INVALID: 'DATA_INVALID',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DEFAULT_STATUS: 'DEFAULT_STATUS',
};

exports.HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  DEFAULT: 0x0,
};

exports.ERROR_MAP = {
  // TODO: not yet declare
  [this.HTTP_STATUS.BAD_REQUEST]: {
    FORMAT_INVALID: {
      code: 10000,
      message: 'The request format is invalid',
    },
    DATA_EXISTED: {
      code: 10002,
      message: 'The data has exist in database',
    },
    DATA_INVALID: {
      code: 10003,
      message: 'The data is invalid',
    },
    LOGIN_REQUIRED: {
      code: 10004,
      message: 'Please login first',
    },
  },
  [this.HTTP_STATUS.FORBIDDEN]: {
    PERMISSION_DENIED: {
      code: 10005,
      message: 'You have no permission to operate',
    },
  },
  [this.HTTP_STATUS.NOT_FOUND]: {
    DATA_NOT_FOUND: {
      code: 10001,
      message: 'The data is not found in database',
    },
  },
  [this.HTTP_STATUS.INTERNAL_SERVER_ERROR]: {
    INTERNAL_SERVER_ERROR: {
      code: 10006,
      message: 'internal server error!',
    },
  },
  // default status
  [this.HTTP_STATUS.DEFAULT]: {
    DEFAULT_STATUS: {
      code: 99999,
      message: 'default not giving value',
    },
  },
};
