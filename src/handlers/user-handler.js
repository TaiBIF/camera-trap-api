const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const UserModel = require('../models/data/user-model');
const UsersSearchForm = require('../forms/user/users-search-form');

exports.getUsers = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/users
  提供加入計畫成員前檢查帳號是否存在
  */
  const form = new UsersSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const userQuery = UserModel.find();
  if (form.user.indexOf('@') >= 0) {
    userQuery.where({ email: form.user });
  } else {
    userQuery.where({ orcId: form.user });
  }

  return UserModel.paginate(userQuery, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(users => {
    res.json(new PageList(form.index, form.size, users.totalDocs, users.docs));
  });
});
