const UserPermission = require('../models/const/user-permission');
const errors = require('../models/errors');
const auth = require('../auth/authorization');
const ProfileForm = require('../forms/account/profile-form');

exports.logout = auth(
  /*
  POST /api/v1/logout
   */
  UserPermission.all(),
  (req, res) =>
    new Promise((resolve, reject) => {
      req.session.destroy(error => {
        if (error) {
          return reject(error);
        }
        resolve(res.json({}));
      });
    }),
);

exports.getMyProfile = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/me
   */
  res.json(req.user.dump());
});

exports.updateMyProfile = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/me
   */
  const form = new ProfileForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  req.user.name = form.name;
  req.user.email = form.email;
  return req.user.save().then(user => res.json(user.dump()));
});
