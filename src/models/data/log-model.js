const mongoose = require('mongoose');
const utils = require('../../common/utils');

const { Schema } = mongoose;
utils.connectDatabase();
const model = mongoose.model(
  'LogModel',
  utils.generateSchema(
    {
      hostname: {
        type: String,
      },
      user: {
        type: Schema.ObjectId,
        ref: 'UserModel',
        index: {
          name: 'User',
        },
      },
      ip: {
        type: String,
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
      extra: {
        // json string
        type: String,
      },
      responseStatus: {
        type: Number,
        default: 0,
      },
      errorStack: {
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
    hostname: this.hostname,
    user:
      this.user && typeof this.user.dump === 'function'
        ? this.user.dump()
        : this.user,
    ip: this.ip,
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
    extra: (function() {
      if (!this.extra) {
        return this.extra;
      }
      try {
        return JSON.parse(this.extra);
      } catch (error) {
        return this.extra;
      }
    })(),
    responseStatus: this.responseStatus,
    errorStack: this.errorStack,
    processTime: this.processTime,
  };
};

module.exports = model;
