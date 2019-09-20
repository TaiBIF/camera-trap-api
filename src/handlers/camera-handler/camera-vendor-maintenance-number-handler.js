const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const CameraVNSearchForm = require('../../forms/camera/camera-vendor-maintenance-number-search-form');
const CameraVNModel = require('../../models/data/camera-vendor-maintenance-number-model');
const PageList = require('../../models/page-list');

exports.getVNs = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/cameras-vn
   */
  const form = new CameraVNSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  const query = CameraVNModel.where();
  if (form.name) {
    query.where({ name: { $regex: `${form.name}`, $options: 'i' } });
  }
  return CameraVNModel.paginate(query.sort(form.sort)).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});
