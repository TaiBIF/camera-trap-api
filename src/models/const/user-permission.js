module.exports = {
  administrator: 'administrator', // 系統管理員
  generalAccount: 'general-account', // 一般帳戶
  guest: 'guest', // 遊客

  // 需要註冊
  all() {
    return [this.administrator, this.generalAccount];
  },
  // 不需要註冊 ex: 遊客
  any() {
    return [this.administrator, this.generalAccount, this.guest];
  },
};
