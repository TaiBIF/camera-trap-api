module.exports = {
  waitForReview: 'wait-for-review', // 等待審核
  published: 'published', // 審核通過並發布
  rejected: 'rejected', // 審核未通過
  all() {
    return [this.waitForReview, this.published, this.rejected];
  },
};
