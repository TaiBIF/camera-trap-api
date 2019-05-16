const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');

exports.locationMonthRetrieved = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/month-retrieved
   */
  const { projectId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrieved(projectId, year);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByStudyArea = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/month-retrieved
   */
  const { projectId, studyAreaId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrievedByStudyArea(projectId, studyAreaId, year);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByCameraLocation = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/camera-locations/:cameraLocationId/month-retrieved
   */
  const { projectId, cameraLocationId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrievedByCamera(
        projectId,
        cameraLocationId,
        year,
      );
    })
    .then(records => {
      res.json(records);
    });
};
