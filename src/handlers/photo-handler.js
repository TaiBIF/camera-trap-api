const PhotoForm = require('../forms/photo/photo-form');
const PhotoModel = require('../models/data/photo-model');
const errors = require('../models/errors');
const auth = require('../auth/authorization');
const UserPermission = require('../models/const/user-permission');

exports.getCarousels = async (req, res) => {
  /*
  GET /api/v1/carousel
   */
  // const form = PhotoForm(req.query)
  const query = await PhotoModel.where();
  res.json(query);
};

exports.postCarousel = auth(UserPermission.all(), (req, res) => {
  const form = new PhotoForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([PhotoModel.findOne({ name: form.name })])
    .then(([photo]) => {
      if (photo) {
        throw new errors.Http400('Cannot use the same name');
      }
      const result = new PhotoModel({
        ...form,
      });
      return Promise.all([result.save()]);
    })
    .then(([photo]) => {
      res.json(photo.dump());
    });
});
