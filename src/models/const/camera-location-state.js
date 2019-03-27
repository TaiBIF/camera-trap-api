module.exports = {
  active: 'active', // 使用中
  suspended: 'suspended', // 停用中
  removed: 'removed', // 已撤除
  all() {
    return [this.active, this.suspended, this.removed];
  },
};
