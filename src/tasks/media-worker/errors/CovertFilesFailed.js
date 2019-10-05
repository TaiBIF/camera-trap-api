const UploadSessionErrorType = require('../../../models/const/upload-session-error-type');

function ConvertFilesFailed(message) {
  this.name = 'ConvertFilesFailed';
  this.message = message;
  this.type = UploadSessionErrorType.convertFilesFailed;
}

ConvertFilesFailed.prototype = new Error();
ConvertFilesFailed.prototype.constructor = ConvertFilesFailed;

module.exports = ConvertFilesFailed;
