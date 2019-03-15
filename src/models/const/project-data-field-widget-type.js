module.exports = {
  text: 'text', // 輸入框
  select: 'select', // 下拉選單
  time: 'time', // 日期時間
  all() {
    return [this.text, this.select, this.time];
  },
};
