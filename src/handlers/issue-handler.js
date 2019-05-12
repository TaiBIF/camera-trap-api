const errors = require('../models/errors');
const utils = require('../common/utils');
const Mail = require('../common/mail');
const IssueForm = require('../forms/issue/issue-form');
const IssueModel = require('../models/data/issue-model');
const UserPermission = require('../models/const/user-permission');
const UserModel = require('../models/data/user-model');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');
const NotificationModel = require('../models/data/notification-model');
const NotificationType = require('../models/const/notification-type');

exports.addIssue = (req, res) => {
  /*
  POST /api/v1/issues
  */
  const form = new IssueForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return FileModel.findById(form.attachmentFile)
    .where({ type: FileType.issueAttachment })
    .then(file => {
      if (form.attachmentFile && !file) {
        throw new errors.Http400('The attachment file not found.');
      }

      const issue = new IssueModel({
        ...form,
        attachmentFile: file,
      });
      return Promise.all([
        issue.save(),
        UserModel.where({ permission: UserPermission.administrator }),
      ]);
    })
    .then(([issue, users]) => {
      const mail = new Mail();
      mail.sendIssueToSystemAdmin(issue, users).catch(error => {
        utils.logError(error, { issue: issue.dump() });
      });
      Promise.all(
        users.map(user => {
          const notification = new NotificationModel({
            user,
            type: NotificationType.newIssue,
            issue,
          });
          return notification.save();
        }),
      ).catch(error => {
        utils.logError(error, { issue: issue.dump() });
      });

      res.json(issue.dump());
    });
};
