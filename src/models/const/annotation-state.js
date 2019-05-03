module.exports = {
  waitForReview: 'wait-for-review', // 等待確認覆蓋或取消
  active: 'active', // 有效的標註
  cancel: 'cancel', // 已取消覆蓋
  overwritten: 'overwritten', // 已覆蓋到指定標註
  removed: 'removed', // 已刪除
  all() {
    return [
      this.waitForReview,
      this.active,
      this.cancel,
      this.overwritten,
      this.removed,
    ];
  },
};
