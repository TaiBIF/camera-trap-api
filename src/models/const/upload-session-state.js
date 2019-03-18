module.exports = {
  uploading: 'uploading', // 正在上傳
  success: 'success', // 上傳成功
  failure: 'failure', // 上傳失敗
  all() {
    return [this.uploading, this.success, this.failure];
  },
};
