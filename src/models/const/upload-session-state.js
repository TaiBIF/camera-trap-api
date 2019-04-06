module.exports = {
  processing: 'processing', // 處理中
  success: 'success', // 上傳成功
  failure: 'failure', // 上傳失敗
  all() {
    return [this.processing, this.success, this.failure];
  },
};
