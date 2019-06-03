const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');

exports.retrievedByStudyArea = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/species-time-series
   */
  const { projectId } = req.params;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404('Missing project ID.');
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403('Insufficient privilege.');
      }
      return ProjectModel.speciesTimeSeries(projectId, 'project', projectId);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByCameraLocation = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/species-time-series
   */
  const { projectId, studyAreaId } = req.params;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404('Missing project ID.');
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403('Insufficient privilege.');
      }
      return ProjectModel.speciesTimeSeries(
        projectId,
        'studyArea',
        studyAreaId,
      );
    })
    .then(records => {
      res.json(records);
    });
};
