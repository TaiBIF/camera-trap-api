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
  const { tripId } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (tripId !== 'all') {
        return ProjectModel.getSpeciesGroup(projectId, tripId);
      }
      // eslint-disable-next-line no-else-return
      else {
        return ProjectModel.getSpeciesGroup(projectId);
      }
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

exports.getByProjectIdAndStudyAreaId = auth(
  UserPermission.all(),
  (req, res) => {
    /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/image-species-group
   */
    const { projectId, studyAreaId } = req.params;
    const { tripId } = req.query;

    return ProjectModel.findById(projectId)
      .then(project => {
        if (!project) {
          throw new errors.Http404();
        }
        if (!project.canAccessBy(req.user)) {
          throw new errors.Http403();
        }
        if (tripId !== 'all') {
          return ProjectModel.getStudyAreaSpeciesGroup(
            projectId,
            studyAreaId,
            tripId,
          );
        }
        // eslint-disable-next-line no-else-return
        else {
          return ProjectModel.getStudyAreaSpeciesGroup(projectId, studyAreaId);
        }
      })
      .then(records => {
        const timeUpdated = new Date();
        res.json({
          records: _.sortBy(records, 'count'),
          total: _.reduce(records, (sum, row) => sum + row.count, 0),
          timeUpdated,
        });
      });
  },
);
