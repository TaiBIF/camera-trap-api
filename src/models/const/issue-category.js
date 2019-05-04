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
  dict(issueCategory) {
    switch (issueCategory) {
      case this.system:
        return '系統操作';
      case this.account:
        return '帳號相關';
      case this.projectManagement:
        return '計畫管理';
      case this.fileUpload:
        return '檔案上傳';
      case this.dataEdit:
        return '資料編輯';
      case this.searchAndDownload:
        return '篩選及下載';
      case this.others:
        return '其他問題';
      default:
    }
  },
};
