const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const UserModel = require('../models/data/user-model');

exports.getUsers = auth(UserPermission.all(), (req, res) => {
  /*
    GET /api/v1/users
    提供加入計畫成員前檢查帳號是否存在
   */
  const req_query = req.query;
  const userQuery = UserModel.find();

  if (Object.keys(req_query).length > 0) {
    if (req_query.hasOwnProperty('email')) {
      userQuery.where({ email: req_query.email });
    }
    if (req_query.hasOwnProperty('orcId')) {
      userQuery.where({ orcId: req_query.orcId });
    }
    return Promise.all([userQuery.findOne()]).then(([users]) => {
      const ret = users ? users.dump() : [];
      res.json(ret);
    });
  }
  else {
    return res.json([]);
  }
});
