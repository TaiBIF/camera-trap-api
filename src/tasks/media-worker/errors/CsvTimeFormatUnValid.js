const UploadSessionErrorType = require('../../../models/const/upload-session-error-type');

function CsvTimeFormatUnValid(message) {
  this.name = 'CsvTimeFormatUnValid';
  this.message = message || 'CSV 時間格式錯誤';
  this.type = UploadSessionErrorType.csvTimeFormatUnValid;
}

CsvTimeFormatUnValid.prototype = new Error();
CsvTimeFormatUnValid.prototype.constructor = CsvTimeFormatUnValid;

module.exports = CsvTimeFormatUnValid;
