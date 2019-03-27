module.exports = {
  system: 'system', // 系統公告
  uploadSuccess: 'upload-success', // 上傳成功
  uploadFailure: 'upload-failure', // 上傳失敗
  dataFieldApplication: 'data-field-application', // 申請新欄位
  dataFieldApproved: 'data-field-approved', // 通過欄位申請
  newIssue: 'new-issue', // 問題回報
  newSuggestion: 'new-suggestion', // 意見反饋
  all() {
    return [
      this.system,
      this.uploadSuccess,
      this.uploadFailure,
      this.dataFieldApplication,
      this.dataFieldApproved,
      this.newIssue,
      this.newSuggestion,
    ];
  },
};
