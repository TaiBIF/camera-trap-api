module.exports = {
  system: 'system', // 系統公告
  uploadSuccess: 'upload-success', // 上傳成功
  uploadFailure: 'upload-failure', // 上傳失敗
  applicationDataField: 'application-data-field', // 申請新欄位
  acceptDataField: 'accept-data-field', // 通過欄位申請
  newIssue: 'new-issue', // 問題回報
  newSuggestion: 'new-suggestion', // 意見反饋
  all() {
    return [
      this.system,
      this.uploadSuccess,
      this.uploadFailure,
      this.applicationDataField,
      this.acceptDataField,
      this.newIssue,
      this.newSuggestion,
    ];
  },
};
