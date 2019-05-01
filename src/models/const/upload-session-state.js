module.exports = {
  processing: 'processing', // 處理中
  waitForReview: 'wait-for-review', // 等待確認覆蓋或取消
  cancel: 'cancel', // 取消覆蓋
  success: 'success', // 上傳成功
  failure: 'failure', // 上傳失敗
  all() {
    return [
      this.processing,
      this.waitForReview,
      this.cancel,
      this.success,
      this.failure,
    ];
  },
};
