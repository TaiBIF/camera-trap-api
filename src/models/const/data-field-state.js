module.exports = {
  waitForReview: 'wait-for-review', // 等待審核
  approved: 'approved', // 審核通過並發布
  rejected: 'rejected', // 審核未通過
  all() {
    return [this.waitForReview, this.approved, this.rejected];
  },
};
