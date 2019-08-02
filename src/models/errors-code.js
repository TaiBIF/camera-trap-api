exports.ERROR = {
  FORMAT_INVALID: 'FORMAT_INVALID',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_EXISTED: 'DATA_EXISTED',
  DATA_INVALID: 'DATA_INVALID',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DEFAULT_STATUSCODE: 'DEFAULT_STATUSCODE',
};

exports.ERROR_MAP = {
  // TODO: not yet declare
  FORMAT_INVALID: {
    status: 400,
    code: 10000,
    message: 'The request format is invalid',
  },
  DATA_NOT_FOUND: {
    status: 404,
    code: 10001,
    message: 'The data is not found in database',
  },
  DATA_EXISTED: {
    status: 400,
    code: 10002,
    message: 'The data has exist in database',
  },
  DATA_INVALID: {
    status: 400,
    code: 10003,
    message: 'The data is invalid',
  },
  LOGIN_REQUIRED: {
    status: 400,
    code: 10004,
    message: 'Please login first',
  },
  PERMISSION_DENIED: {
    status: 403,
    code: 10005,
    message: 'You have no permission to operate',
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    code: 10006,
    message: 'internal server error!',
  },

  // default status
  DEFAULT_STATUSCODE: {
    status: 400,
    code: 99999,
    message: 'statusCode not giving value',
  },
};
