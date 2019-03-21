const utils = require('../common/utils');
const UserModel = require('../models/data/user-model');
const UserPermission = require('../models/const/user-permission');

exports.session = (req, res, next) => {
  const { userId } = req.session;
  if (!userId) {
    req.user = utils.getAnonymous();
    return next();
  }
  UserModel.findById(userId)
    .then(user => {
      if (!user) {
        req.user = utils.getAnonymous();
        return next();
      }
      req.user = user;
      next();
    })
    .catch(error => {
      next(error);
    });
};

exports.orcid = profile =>
  /*
  @param profile {Object}
    name: {string}
    orcid: {string}
  @returns {Promise<UserModel>}
   */
  UserModel.findOne({ orcId: profile.orcid }).then(user => {
    if (user) {
      return user;
    }
    const newUser = new UserModel({
      name: profile.name,
      orcId: profile.orcid,
      permission: UserPermission.generalAccount,
    });
    return newUser.save();
  });
