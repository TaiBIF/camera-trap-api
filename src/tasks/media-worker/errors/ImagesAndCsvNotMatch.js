const UploadSessionErrorType = require('../../../models/const/upload-session-error-type');

function ImagesAndCsvNotMatch(message) {
  this.name = 'imagesAndCsvNotMatch';
  this.message = message;
  this.type = UploadSessionErrorType.imagesAndCsvNotMatch;
}

ImagesAndCsvNotMatch.prototype = new Error();
ImagesAndCsvNotMatch.prototype.constructor = ImagesAndCsvNotMatch;

module.exports = ImagesAndCsvNotMatch;
