const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const Mail = require('../common/mail');
const UserPermission = require('../models/const/user-permission');
const IssueForm = require('../forms/issue/issue-form');
const IssueModel = require('../models/data/issue-model');

exports.addIssue = auth(UserPermission.all(), (req, res) => {
  /*
    GET /api/v1/issues
    聯絡我們, 讓使用者上傳附件
  */
  const form = new IssueForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }


  const issue = new IssueModel({
    ...form
  });

  return Promise.all([
    issue.save()
  ])
    .then(([issue]) => {
      const mail = new Mail();
      mail
        .sendIssueToUser(user, project)
        .catch(error => {
          utils.logError(error, { issue: issue.dump() });
        });
      res.json(issue.dump());
    });
});
