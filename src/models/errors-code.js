exports.ERROR = {
  FORMAT_INVALID: 'FORMAT_INVALID',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_EXISTED: 'DATA_EXISTED',
  DATA_INVALID: 'DATA_INVALID',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
};

exports.ERROR_MAP = {
  // TODO: not yet declare
  FORMAT_INVALID: {
    code: 10000,
    message: 'The request format is invalid',
  },
  DATA_NOT_FOUND: {
    code: 10001,
    message: 'The data is not found in database',
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
  PERMISSION_DENIED: {
    code: 10005,
    message: 'You have no permission to operate',
  },

  // default status
  DEFAULT_STATUSCODE: {
    code: 99999,
    message: 'statusCode not giving value',
  },
};
