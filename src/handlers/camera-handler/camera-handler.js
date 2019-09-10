const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const CameraSearchForm = require('../../forms/camera/camera-search-form');
const CameraModel = require('../../models/data/camera-model');
const CameraState = require('../../models/const/camera-state');
const PageList = require('../../models/page-list');

exports.getCameras = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/cameras
   */
  const form = new CameraSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = CameraModel.where({ state: CameraState.active });
  if (form.manufacturer) {
    query.where({
      manufacturer: { $regex: `${form.manufacturer}`, $options: 'i' },
    });
  }
  if (form.model) {
    query.where({ model: { $regex: `${form.model}`, $options: 'i' } });
  }
  if (form.sn) {
    query.where({ sn: { $regex: `${form.sn}`, $options: 'i' } });
  }
  if (form.vn) {
    query.where({ vn: { $regex: `${form.vn}`, $options: 'i' } });
  }
  return CameraModel.paginate(query.sort(form.sort), {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});
