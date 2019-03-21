module.exports = {
  active: 'active', // 啟用
  deleted: 'deleted', // 已刪除
  all() {
    return [this.active, this.deleted];
  },
};
