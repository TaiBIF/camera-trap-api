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
