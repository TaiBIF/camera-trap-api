const UploadSessionErrorType = require('../../../models/const/upload-session-error-type');

function NotFoundCamera(message) {
  this.name = 'NotFoundCamera';
  this.message = message;
  this.type = UploadSessionErrorType.others;
}

NotFoundCamera.prototype = new Error();
NotFoundCamera.prototype.constructor = NotFoundCamera;

module.exports = NotFoundCamera;
