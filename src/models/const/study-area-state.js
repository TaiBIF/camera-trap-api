module.exports = {
  active: 'active', // 啟用
  suspended: 'suspended', // 停用中
  decommissioned: 'decommissioned', // 已除役
  all() {
    return [this.active, this.suspended, this.decommissioned];
  },
};
