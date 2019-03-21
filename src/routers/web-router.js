const express = require('express');
const errors = require('../models/errors');
const accountHandler = require('../handlers/account-handler');

const expressRouter = express.Router();
module.exports = expressRouter;

const promiseErrorHandler = func =>
  function() {
    // eslint-disable-next-line prefer-rest-params
    const next = arguments[2];
    // eslint-disable-next-line prefer-rest-params
    const result = func(...arguments);

    if (result && typeof result.catch === 'function') {
      result.catch(error => {
        if (error instanceof Error) {
          // This error is errors.HttpXXX().
          next(error);
        } else {
          next(new errors.Http500(error));
        }
      });
    }
    return result;
  };

const router = {
  get: (path, handler) => {
    expressRouter.get(path, promiseErrorHandler(handler));
  },
  post: (path, handler) => {
    expressRouter.post(path, promiseErrorHandler(handler));
  },
  put: (path, handler) => {
    expressRouter.put(path, promiseErrorHandler(handler));
  },
  delete: (path, handler) => {
    expressRouter.delete(path, promiseErrorHandler(handler));
  },
};

router.get('/me', accountHandler.getMyProfile);
router.post('/logout', accountHandler.logout);
