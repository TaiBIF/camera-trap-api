const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const CameraModelSearchForm = require('../../forms/camera/camera-model-search-form');
const CameraModelModel = require('../../models/data/camera-model-model');
const PageList = require('../../models/page-list');

exports.getModels = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/cameras-models
   */
  const form = new CameraModelSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = CameraModelModel.where();
  if (form.name) {
    query.where({ name: { $regex: `${form.name}`, $options: 'i' } });
  }
  return CameraModelModel.paginate(query.sort(form.sort)).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});
