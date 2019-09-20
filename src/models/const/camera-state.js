module.exports = {
  active: 'active', // 使用中
  suspended: 'suspended', // 停用中
  service: 'service', // 維修中
  removed: 'removed', // 已撤除
  all() {
    return [this.active, this.suspended, this.service, this.removed];
  },
};
