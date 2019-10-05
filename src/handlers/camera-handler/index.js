const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const CameraHandler = require('./camera-handler');
const CameraManufacturerHandler = require('./camera-manufacturer-handler');
const CameraModelHandler = require('./camera-model-handler');
const CameraSNHandler = require('./camera-serial-number-handler');
const CameraVNHandler = require('./camera-vendor-maintenance-number-handler');

exports.getCameras = auth(UserPermission.all(), CameraHandler.getCameras);
exports.getCameraManufacturers = auth(
  UserPermission.all(),
  CameraManufacturerHandler.getManufacturers,
);
exports.getCameraModels = auth(
  UserPermission.all(),
  CameraModelHandler.getModels,
);
exports.getCameraSNs = auth(UserPermission.all(), CameraSNHandler.getSNs);
exports.getCameraVNs = auth(UserPermission.all(), CameraVNHandler.getVNs);
