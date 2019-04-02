const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const ProjectRole = require('../models/const/project-role');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const CameraLocationForm = require('../forms/camera-location/camera-location-form');
const CameraLocationsSearchForm = require('../forms/camera-location/camera-locations-search-form');

exports.getProjectCameraLocations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/camera-locations
   */
  const form = new CameraLocationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = CameraLocationModel.where({
    project: req.params.projectId,
  }).where({ state: CameraLocationState.active });
  if (form.name) {
    query.where({ name: form.name });
  }
  return CameraLocationModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.getStudyAreaCameraLocations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/study-areas/:studyAreaId/camera-locations
   */
  const form = new CameraLocationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    StudyAreaModel.findById(req.params.studyAreaId),
    StudyAreaModel.where({ state: StudyAreaState.active }).where({
      parent: req.params.studyAreaId,
    }),
  ])
    .then(([project, studyArea, subStudyAreas]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        !studyArea ||
        studyArea.state !== StudyAreaState.active ||
        `${studyArea.project._id}` !== `${project._id}`
      ) {
        throw new errors.Http404();
      }
      if (
        req.user.permission !== UserPermission.administrator &&
        !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
      ) {
        throw new errors.Http403();
      }

      const studyAreaIds = [`${studyArea._id}`];
      if (subStudyAreas.length) {
        subStudyAreas.forEach(x => studyAreaIds.push(`${x._id}`));
      }
      const query = CameraLocationModel.where({
        state: CameraLocationState.active,
      }).where({ studyArea: { $in: studyAreaIds } });
      return CameraLocationModel.paginate(query, {
        offset: form.index * form.size,
        limit: form.size,
      });
    })
    .then(result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});

exports.addStudyAreaCameraLocation = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects/:projectId/study-areas/:studyAreaId/camera-locations
   */
  const form = new CameraLocationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    StudyAreaModel.findById(req.params.studyAreaId),
  ])
    .then(([project, studyArea]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        !studyArea ||
        studyArea.state !== StudyAreaState.active ||
        `${studyArea.project._id}` !== `${project._id}`
      ) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }

      const cameraLocation = new CameraLocationModel({
        ...form,
        project,
        studyArea,
      });
      return cameraLocation.save();
    })
    .then(cameraLocation => {
      res.json(cameraLocation.dump());
    });
});

exports.updateCameraLocation = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/camera-locations/:cameraLocationId
   */
  const form = new CameraLocationForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    CameraLocationModel.findById(req.params.cameraLocationId).populate(
      'studyArea',
    ),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        !cameraLocation ||
        `${cameraLocation.project._id}` !== `${project._id}` ||
        cameraLocation.state === CameraLocationState.removed
      ) {
        throw new errors.Http404();
      }
      if (cameraLocation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }

      Object.assign(cameraLocation, form);
      return cameraLocation.save();
    })
    .then(cameraLocation => {
      res.json(cameraLocation.dump());
    });
});

exports.deleteCameraLocation = auth(UserPermission.all(), (req, res) =>
  /*
  DELETE /api/v1/projects/:projectId/camera-locations/:cameraLocationId
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    CameraLocationModel.findById(req.params.cameraLocationId).populate(
      'studyArea',
    ),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        !cameraLocation ||
        `${cameraLocation.project._id}` !== `${project._id}` ||
        cameraLocation.state === CameraLocationState.removed
      ) {
        throw new errors.Http404();
      }
      if (cameraLocation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }

      cameraLocation.state = CameraLocationState.removed;
      return cameraLocation.save();
    })
    .then(() => {
      res.status(204).send();
    }),
);
