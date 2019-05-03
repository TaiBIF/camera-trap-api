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
  if (form.name !== undefined) {
    userQuery.where({ name: form.name });
  }
  if (form.orcid !== undefined) {
    userQuery.where({ orcId: form.orcid });
  }
  if (form.email !== undefined) {
    userQuery.where({ email: form.email });
  }
  if (
    form.name === undefined &&
    form.orcid === undefined &&
    form.email === undefined
  ) {
    throw new errors.Http400(errorMessage);
  }

  return UserModel.paginate(userQuery, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(users => {
    res.json(new PageList(form.index, form.size, users.totalDocs, users.docs));
  });
});
