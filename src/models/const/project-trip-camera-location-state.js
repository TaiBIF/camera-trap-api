module.exports = {
  setting: 'setting', // 設置
  exchange: 'exchange', // 更換
  removed: 'removed', // 已撤除
  all() {
    return [this.setting, this.exchange, this.removed];
  },
};
