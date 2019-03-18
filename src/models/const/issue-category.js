module.exports = {
  system: 'system', // 系統操作
  account: 'account', // 帳號相關
  projectManagement: 'project-management', // 計畫管理
  fileUpload: 'file-upload', // 檔案上傳
  dataEdit: 'data-edit', // 資料編輯
  searchAndDownload: 'search-and-download', // 篩選及下載
  others: 'others', // 其他問題
  all() {
    return [
      this.system,
      this.account,
      this.projectManagement,
      this.fileUpload,
      this.dataEdit,
      this.searchAndDownload,
      this.others,
    ];
  },
};
