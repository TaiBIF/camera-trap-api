module.exports = {
  processing: 'processing', // 處理中
  waitForReview: 'wait-for-review', // 等待確認覆蓋或取消
  success: 'success', // 上傳成功
  failure: 'failure', // 上傳失敗
  all() {
    return [this.processing, this.waitForReview, this.success, this.failure];
  },
};
