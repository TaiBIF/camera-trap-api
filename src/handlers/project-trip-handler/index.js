const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const ProjectTripHandler = require('./project-trip-handler');

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
