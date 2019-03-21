const UserPermission = require('../models/const/user-permission');
const auth = require('../auth/authorization');

exports.logout = (req, res) => {
  /*
  POST /api/v1/logout
   */
  throw new Error('not implemented');
};

exports.getMyProfile = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/me
   */
  res.json(req.user.dump());
});
