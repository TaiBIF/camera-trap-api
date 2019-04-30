const auth = require('../auth/authorization');
const errors = require('../models/errors');
//const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const IssueForm = require('forms/issue/issue-form');
const IssueModel = require('model/data/issue/issue-model');

exports.getUsers = auth(UserPermission.all(), (req, res) => {
  /*
    GET /api/v1/issues
    聯絡我們, 讓使用者上傳附件
  */
  const form = new IssueForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  /*const userQuery = UserModel.find();
  if (form.user.indexOf('@') >= 0) {
    userQuery.where({ email: form.user });
  } else {
    userQuery.where({ orcId: form.user });
  }*/

  /*
  return UserModel.paginate(userQuery, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(users => {
    res.json(new PageList(form.index, form.size, users.totalDocs, users.docs));
  });
  */

  return res.json({foo:'bra'});
});
