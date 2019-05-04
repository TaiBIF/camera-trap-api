module.exports = {
  issue: 'issue', // 問題回報
  suggestion: 'suggestion', // 意見反饋
  all() {
    return [this.issue, this.suggestion];
  },
  dict(issueType) {
    switch (issueType) {
      case this.issue:
        return '問題回報';
      case this.suggestion:
        return '意見反饋';
      default:
    }
  },
};
