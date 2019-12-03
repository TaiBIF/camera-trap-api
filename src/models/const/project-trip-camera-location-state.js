module.exports = {
  setting: 'setting', // 設置
  exchange: 'exchange', // 替換
  removed: 'removed', // 移除
  lost: 'lost', // 遺失且未設置
  lostAndSet: 'lostAndSet', // 遺失並設置
  undefinded: '',
  all() {
    return [
      this.setting,
      this.exchange,
      this.removed,
      this.lost,
      this.lostAndSet,
      this.undefinded,
    ];
  },
};
