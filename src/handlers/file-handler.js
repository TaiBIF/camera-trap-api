const auth = require('../auth/authorization');
const UserPermission = require('../models/const/user-permission');
const uploadFile = require('./file-handler/uploadFile');
const uploadAnnotationFile = require('./file-handler/uploadAnnotationFile');

exports.uploadFile = auth(UserPermission.all(), uploadFile);

exports.uploadAnnotationFile = auth(UserPermission.all(), uploadAnnotationFile);
