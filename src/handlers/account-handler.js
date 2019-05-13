const UserPermission = require('../models/const/user-permission');
const errors = require('../models/errors');
const auth = require('../auth/authorization');
const ProfileForm = require('../forms/account/profile-form');
const SpeciesModel = require('../models/data/species-model');

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
        resolve(res.status(204).send());
      });
    }),
);

exports.getMyProfile = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/me
   */
  SpeciesModel.populate(req.user, 'hotkeys.species').then(() => {
    res.json(req.user.dump(req));
  }),
);

exports.updateMyProfile = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/me
   */
  const form = new ProfileForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return SpeciesModel.where({
    _id: { $in: form.hotkeys.map(x => x.species) },
  })
    .then(speciesList => {
      if (form.hotkeys.length !== speciesList.length) {
        throw new errors.Http400('Some species are not found.');
      }

      req.user.name = form.name;
      req.user.email = form.email;
      req.user.hotkeys = form.hotkeys.map(item => ({
        species: speciesList.find(x => `${x._id}` === item.species),
        hotkey: item.hotkey,
      }));
      return req.user.save();
    })
    .then(user => {
      res.json(user.dump(req));
    });
});
