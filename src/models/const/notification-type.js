module.exports = {
  system: 'system', // 系統公告
  uploadSuccess: 'upload-success', // 上傳成功
  uploadFailure: 'upload-failure', // 上傳失敗
  waitForOverwrite: 'wait-for-overwrite', // 上傳後因有資料重複問題，等待確認覆蓋或取消
  dataFieldApplication: 'data-field-application', // 申請新欄位
  dataFieldApproved: 'data-field-approved', // 通過欄位申請
  dataFieldRejected: 'data-field-rejected', // 未通過欄位申請
  newIssue: 'new-issue', // 問題回報
  newSuggestion: 'new-suggestion', // 意見反饋
  cameraLocationAbnormality: 'camera-location-abnormality', // 相機異常回報
  all() {
    return [
      this.system,
      this.uploadSuccess,
      this.uploadFailure,
      this.waitForOverwrite,
      this.dataFieldApplication,
      this.dataFieldApproved,
      this.dataFieldRejected,
      this.newIssue,
      this.newSuggestion,
      this.cameraLocationAbnormality,
    ];
  },
};
