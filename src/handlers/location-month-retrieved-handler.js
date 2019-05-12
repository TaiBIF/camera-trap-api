const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');

exports.LocationMonthRetrieved = (req, res) => {
  const { projectId } = req.params;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrievedByProjectStudyArea(projectId);
    })
    .then(records => {
      res.json(records);
    });
};

exports.retrievedByStudyArea = (req, res) => {
  const { projectId, studyAreaId } = req.params;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      return ProjectModel.getRetrievedByStudyArea(projectId, studyAreaId);
    })
    .then(records => {
      res.json(records);
    });
};
