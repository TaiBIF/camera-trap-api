module.exports = {
  emptyShot: 'empty-shot', // 空拍 (相機觸發，但影像中無拍攝到生物)
  testShot: 'test-shot', // 測試 (研究人員安置相機時觸發拍攝之影像，抑或研究人員設置自動拍攝以測試相機運作之影像)
  human: 'human', // 人 (登山客、狩獵者等，非研究人員之人類)
  all() {
    return [this.emptyShot, this.testShot, this.human];
  },
};
