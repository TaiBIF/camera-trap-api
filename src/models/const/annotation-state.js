module.exports = {
  waitForReview: 'wait-for-review', // 等待確認覆蓋或取消
  active: 'active', // 有效的標註
  cancel: 'cancel', // 已取消覆蓋
  removed: 'removed', // 已刪除
  all() {
    return [this.waitForReview, this.active, this.cancel, this.removed];
  },
};
