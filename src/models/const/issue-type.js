module.exports = {
  issue: 'issue', // 問題回報
  suggestion: 'suggestion', // 意見反饋
  all() {
    return [this.issue, this.suggestion];
  },
};
