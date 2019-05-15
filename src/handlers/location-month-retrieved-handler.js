const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');

exports.LocationMonthRetrieved = (req, res) => {
  const { projectId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrieved(projectId, year);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByStudyArea = (req, res) => {
  const { projectId, studyAreaId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrievedByStudyArea(projectId, studyAreaId, year);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByCameraLocation = (req, res) => {
  const { projectId, cameraLocationId } = req.params;
  const { year } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
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
