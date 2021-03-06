const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const ProjectTripHandler = require('./project-trip-handler');

exports.getProjectTripsDateTimeInterval = auth(
  UserPermission.all(),
  ProjectTripHandler.getProjectTripsDateTimeInterval,
);
exports.getProjectTrips = auth(
  UserPermission.all(),
  ProjectTripHandler.getProjectTrips,
);

exports.addProjectTrip = auth(
  UserPermission.all(),
  ProjectTripHandler.addProjectTrip,
);
exports.updateProjectTripByTripId = auth(
  UserPermission.all(),
  ProjectTripHandler.updateProjectTripByTripId,
);
exports.deleteProjectTrapByTrapId = auth(
  UserPermission.all(),
  ProjectTripHandler.deleteProjectTrapByTrapId,
);
exports.updateProjectTripCameraByTripId = auth(
  UserPermission.all(),
  ProjectTripHandler.updateProjectTripCameraByTripId,
);
exports.addProjectTripCameraByTripId = auth(
  UserPermission.all(),
  ProjectTripHandler.addProjectTripCameraByTripId,
);
