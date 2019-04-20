module.exports = {
  newSpecies: 'new-species', // 物種不在預設中，此物種為本次處理時自動新增
  all() {
    return [this.newSpecies];
  },
};
