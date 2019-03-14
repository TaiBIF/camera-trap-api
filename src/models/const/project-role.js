module.exports = {
  manager: 'manager', // 計畫管理員
  researcher: 'researcher', // 計畫研究員
  executor: 'executor', // 計畫執行者
  all() {
    return [this.manager, this.researcher, this.executor];
  },
};
