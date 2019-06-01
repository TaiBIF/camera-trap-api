const _ = require('lodash');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');

exports.getByProjectId = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/image-species-group
   */
  const { projectId } = req.params;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getSpeciesGroup(projectId);
    })
    .then(records => {
      const timeUpdated = new Date();
      res.json({
        records: _.sortBy(records, 'count'),
        total: _.reduce(records, (sum, row) => sum + row.count, 0),
        timeUpdated,
      });
    });
});
