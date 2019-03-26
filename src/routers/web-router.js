const express = require('express');
const errors = require('../models/errors');
const accountHandler = require('../handlers/account-handler');
const callbackHandler = require('../handlers/callback-handler');
const dataFieldHandler = require('../handlers/data-field-handler');
const fileHandler = require('../handlers/file-handler');
const projectHandler = require('../handlers/project-handler');
const speciesHandler = require('../handlers/species-handler');
const systemHandler = require('../handlers/system-handler');

exports.api = express.Router();
exports.callback = express.Router();

class CustomRouter {
  constructor(router) {
    this.router = router;
  }

  static promiseErrorHandler(func) {
    return function() {
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
  }

  get(path, handler) {
    this.router.get(path, CustomRouter.promiseErrorHandler(handler));
  }

  post(path, handler) {
    this.router.post(path, CustomRouter.promiseErrorHandler(handler));
  }

  put(path, handler) {
    this.router.put(path, CustomRouter.promiseErrorHandler(handler));
  }

  delete(path, handler) {
    this.router.delete(path, CustomRouter.promiseErrorHandler(handler));
  }
}

// /api/v1
const apiRouter = new CustomRouter(exports.api);
apiRouter.get('/config', systemHandler.getConfig);
apiRouter.get('/me', accountHandler.getMyProfile);
apiRouter.put('/me', accountHandler.updateMyProfile);
apiRouter.post('/logout', accountHandler.logout);
apiRouter.get('/projects', projectHandler.getProjects);
apiRouter.post('/projects', projectHandler.addProject);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/species',
  speciesHandler.getProjectSpecies,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/species',
  speciesHandler.addProjectSpecies,
);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})/species/:speciesId([a-f\\d]{24})',
  speciesHandler.updateProjectSpecies,
);
apiRouter.delete(
  '/projects/:projectId([a-f\\d]{24})/species/:speciesId([a-f\\d]{24})',
  speciesHandler.deleteProjectSpecies,
);
apiRouter.get('/data-fields', dataFieldHandler.getPublishedDataFields);
apiRouter.post('/data-fields', dataFieldHandler.addDataField);
// multipart/form-data
apiRouter.post('/files', fileHandler.uploadFile);

// /callback
const callbackRouter = new CustomRouter(exports.callback);
callbackRouter.get('/orcid/auth', callbackHandler.orcidAuth);
