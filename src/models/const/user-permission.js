module.exports = {
  administrator: 'administrator', // 系統管理員
  generalAccount: 'general-account', // 一般帳戶
  all() {
    return [this.administrator, this.generalAccount];
  },
};
