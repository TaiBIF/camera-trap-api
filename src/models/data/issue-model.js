const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const IssueType = require('../const/issue-type');
const IssueCategory = require('../const/issue-category');
const FileType = require('../const/file-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'IssueModel',
  utils.generateSchema(
    {
      user: {
        // who open this issue.
        type: Schema.ObjectId,
        ref: 'UserModel',
        index: {
          name: 'User',
        },
      },
      type: {
        type: String,
        enum: IssueType.all(),
        required: true,
      },
      category: {
        type: String,
        enum: IssueCategory.all(),
        required: true,
      },
      description: {
        // 問題描述 / 意見描述
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      attachmentFileName: {
        type: String,
      },
    },
    {
      collection: 'Issues',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    category: this.category,
    description: this.description,
    email: this.email,
    attachmentFileName: this.attachmentFileName,
    attachmentUrl: utils.getFileUrl(
      FileType.issueAttachment,
      this.attachmentFileName,
    ),
  };
};

module.exports = model;
