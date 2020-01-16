const errors = require('../models/errors');
const ProjectModel = require('../models/data/project-model');
const StudyAreaModel = require('../models/data/study-area-model');
const CameraLocationModel = require('../models/data/camera-location-model');

exports.locationMonthRetrieved = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/month-retrieved
   */
  const { projectId } = req.params;
  const { year, tripId } = req.query;

  return ProjectModel.findById(projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      if (tripId !== 'all') {
        return ProjectModel.getRetrieved(projectId, year, tripId);
      }
      // eslint-disable-next-line no-else-return
      else {
        return ProjectModel.getRetrieved(projectId, year);
      }
    })
    .then(records => {
      const timeUpdated = new Date();
      const output = {
        timeUpdated,
        items: records,
      };
      res.json(output);
    });
};

exports.retrievedByStudyArea = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/month-retrieved
   */
  const { projectId, studyAreaId } = req.params;
  const { year, tripId } = req.query;

  return Promise.all([
    ProjectModel.findById(projectId),
    StudyAreaModel.findById(studyAreaId).where({ project: projectId }),
  ])
    .then(([project, studyArea]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (!studyArea) {
        throw new errors.Http404();
      }
      if (tripId !== 'all') {
        return ProjectModel.getRetrievedByStudyArea(
          projectId,
          studyAreaId,
          year,
          tripId,
        );
      }
      // eslint-disable-next-line no-else-return
      else {
        return ProjectModel.getRetrievedByStudyArea(
          projectId,
          studyAreaId,
          year,
        );
      }
    })
    .then(records => {
      const timeUpdated = new Date();
      res.json({
        timeUpdated,
        items: records,
      });
    });
};

exports.retrievedByCameraLocation = (req, res) => {
  /*
  GET /api/v1/projects/:projectId/camera-locations/:cameraLocationId/month-retrieved
   */
  const { projectId, cameraLocationId } = req.params;
  const { year, tripId } = req.query;

  return Promise.all([
    ProjectModel.findById(projectId),
    CameraLocationModel.findById(cameraLocationId).where({
      project: projectId,
    }),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (!cameraLocation) {
        throw new errors.Http404();
      }

      if (tripId !== 'all') {
        return ProjectModel.getRetrievedByCamera(
          projectId,
          cameraLocationId,
          year,
          tripId,
        );
      }
      // eslint-disable-next-line no-else-return
      else {
        return ProjectModel.getRetrievedByCamera(
          projectId,
          cameraLocationId,
          year,
        );
      }
    })
    .then(records => {
      const timeUpdated = new Date();
      res.json({
        timeUpdated,
        items: records,
      });
    });
};
