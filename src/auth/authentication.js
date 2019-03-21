const utils = require('../common/utils');
const UserModel = require('../models/data/user-model');

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
