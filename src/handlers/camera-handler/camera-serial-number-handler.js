const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const CameraSNSearchForm = require('../../forms/camera/camera-serial-number-search-form');
const CameraSNModel = require('../../models/data/camera-serial-number-model');
const PageList = require('../../models/page-list');

exports.getSNs = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/cameras-sn
   */
  const form = new CameraSNSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  const query = CameraSNModel.where();
  if (form.name) {
    query.where({ name: { $regex: `${form.name}`, $options: 'i' } });
  }

  return CameraSNModel.paginate(query.sort(form.sort)).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});
