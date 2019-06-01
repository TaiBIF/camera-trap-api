const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');

exports.retrievedByStudyArea = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/species-time-series
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
      return ProjectModel.speciesTimeSeriesByStudyArea(
        projectId,
        studyAreaId,
        year,
      );
    })
    .then(records => {
      // const timeUpdated = new Date(Date.now()).toISOString();
      // const output = {
      //   timeUpdated,
      //   items: records,
      // };
      res.json(records);
    });
};

exports.retrievedByCameraLocation = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/camera-locations/:cameraLocationId/species-time-series
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
      return ProjectModel.speciesTimeSeriesByCamera(
        projectId,
        cameraLocationId,
        year,
      );
    })
    .then(records => {
      res.json(records);
    });
};
