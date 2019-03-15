const util = require('util');
const config = require('config');
const mongoose = require('mongoose');

let _db;
exports.getDatabaseConnection = () => {
  /*
  Get database connection.
  example: https://github.com/Automattic/mongoose/tree/master/examples/express
  @returns {Connection}
   */
  if (_db) {
    return _db;
  }
  _db = mongoose.createConnection(config.database.url, {
    useNewUrlParser: true,
  });
  return _db;
};

exports.generateSchema = (model, options) => {
  /*
  Generate a instance of mongoose.Schema.
  @params model {Object}
  @params options {Object}  https://mongoosejs.com/docs/guide.html#options
  @return {mongoose.Schema}
   */
  const schema = new mongoose.Schema(
    util._extend(
      {
        createTime: {
          // 資料建立時間
          type: Date,
          default: Date.now,
          index: {
            name: 'CreateTime',
          },
        },
        updateTime: {
          // 資料修改時間
          type: Date,
          default: Date.now,
          index: {
            name: 'UpdateTime',
          },
        },
      },
      model,
    ),
    options,
  );
  schema.pre('save', function(next) {
    this.increment();
    this.updateTime = Date.now();
    next();
  });
  return schema;
};
