const UserPermission = require('../models/const/user-permission');
const errors = require('../models/errors');
const auth = require('../auth/authorization');
const AbnormalCameraLocationForm = require('../forms/abnormal-camera-location/abnormal-camera-location-form');

exports.addAbnormalCameraLocation = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/abnormalcameralocation
   */
  const form = new AbnormalCameraLocationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
});
