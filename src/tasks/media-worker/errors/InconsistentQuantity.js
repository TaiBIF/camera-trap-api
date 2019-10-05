const UploadSessionErrorType = require('../../../models/const/upload-session-error-type');

function InconsistentQuantity(message) {
  this.name = 'NotFoundCamera';
  this.message = message;
  this.type = UploadSessionErrorType.inconsistentQuantity;
}

InconsistentQuantity.prototype = new Error();
InconsistentQuantity.prototype.constructor = InconsistentQuantity;

module.exports = InconsistentQuantity;
