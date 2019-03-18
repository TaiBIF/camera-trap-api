const { Schema } = require('mongoose');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'LogModel',
  utils.generateSchema(
    {
      user: {
        type: Schema.ObjectId,
        ref: 'UserModel',
        index: {
          name: 'User',
        },
      },
      method: {
        type: String,
      },
      path: {
        type: String,
      },
      headers: {
        // json string
        type: String,
      },
      requestBody: {
        // json string
        type: String,
      },
      responseStatus: {
        type: Number,
        default: 0,
      },
      errorMessage: {
        type: String,
      },
      processTime: {
        // milliseconds
        type: Number,
      },
    },
    {
      collection: 'Logs',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    user:
      this.user && typeof this.user.dump === 'function'
        ? this.user.dump()
        : this.user,
    method: this.method,
    path: this.path,
    headers: (function() {
      if (!this.headers) {
        return this.headers;
      }
      try {
        return JSON.parse(this.headers);
      } catch (error) {
        return this.headers;
      }
    })(),
    requestBody: (function() {
      if (!this.requestBody) {
        return this.requestBody;
      }
      try {
        return JSON.parse(this.requestBody);
      } catch (error) {
        return this.requestBody;
      }
    })(),
    responseStatus: this.responseStatus,
    errorMessage: this.errorMessage,
    processTime: this.processTime,
  };
};

module.exports = model;
