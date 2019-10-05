const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const CameraManufacturerSearchForm = require('../../forms/camera/camera-manufacturer-search-form');
const CameraManufacturerModel = require('../../models/data/camera-manufacturer-model');
const PageList = require('../../models/page-list');

exports.getManufacturers = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/cameras-manufacturers
   */
  const form = new CameraManufacturerSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  const query = CameraManufacturerModel.where();
  if (form.name) {
    query.where({ name: { $regex: `${form.name}`, $options: 'i' } });
  }
  return CameraManufacturerModel.paginate(query.sort(form.sort)).then(
    result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    },
  );
});
