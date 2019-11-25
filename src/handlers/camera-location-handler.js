const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const CameraLocationForm = require('../forms/camera-location/camera-location-form');
const CameraLocationsSearchForm = require('../forms/camera-location/camera-locations-search-form');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const searchCameraLocation = require('./camera-location-handler/searchByParams');

exports.searchCameraLocation = auth(UserPermission.all(), searchCameraLocation);

exports.getProjectCameraLocations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/camera-locations
  提供新增相機位置時檢查相機位置名稱是否使用
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
  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    CameraLocationModel.paginate(query, {
      offset: form.index * form.size,
      limit: form.size,
    }),
  ]).then(([project, cameraLocations]) => {
    if (!project) {
      throw new errors.Http404();
    }
    if (!project.canAccessBy(req.user)) {
      throw new errors.Http403();
    }

    res.json(
      new PageList(
        form.index,
        form.size,
        cameraLocations.totalDocs,
        cameraLocations.docs,
      ),
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
    StudyAreaModel.findById(req.params.studyAreaId)
      .where({ state: StudyAreaState.active })
      .where({ project: req.params.projectId }),
    StudyAreaModel.where({ state: StudyAreaState.active })
      .where({ parent: req.params.studyAreaId })
      .where({ project: req.params.projectId }),
  ])
    .then(([project, studyArea, subStudyAreas]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!studyArea) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      const studyAreaIds = [`${studyArea._id}`];
      subStudyAreas.forEach(x => studyAreaIds.push(`${x._id}`));
      const query = CameraLocationModel.where({
        state: CameraLocationState.active,
        studyArea: { $in: studyAreaIds },
      }).populate('lockUser');
      return CameraLocationModel.paginate(query, {
        offset: form.index * form.size,
        limit: form.size,
      });
    })
    .then(result =>
      Promise.all([
        Promise.resolve(result.totalDocs),
        CameraLocationModel.joinFailuresAndCanTrash(result.docs),
      ]),
    )
    .then(([totalDocs, cameraLocations]) => {
      res.json(new PageList(form.index, form.size, totalDocs, cameraLocations));
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
    StudyAreaModel.findById(req.params.studyAreaId)
      .where({ project: req.params.projectId })
      .where({ state: StudyAreaState.active }),
  ])
    .then(([project, studyArea]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!studyArea) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
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

exports.getCameraLocation = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/camera-locations/:cameraLocationId
   */
  CameraLocationModel.findById(req.params.cameraLocationId)
    .where({ state: CameraLocationState.active })
    .populate('project')
    .populate('studyArea')
    .then(cameraLocation => {
      if (!cameraLocation) {
        throw new errors.Http404();
      }
      if (!cameraLocation.project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      return StudyAreaModel.populate(cameraLocation, 'studyArea.parent');
    })
    .then(cameraLocation => {
      res.json(cameraLocation.dump());
    }),
);

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
    CameraLocationModel.findById(req.params.cameraLocationId)
      .where({ project: req.params.projectId })
      .where({ state: CameraLocationState.active })
      .populate('studyArea'),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!cameraLocation) {
        throw new errors.Http404();
      }
      if (cameraLocation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
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
    CameraLocationModel.findById(req.params.cameraLocationId)
      .where({ project: req.params.projectId })
      .where({ state: CameraLocationState.active })
      .populate('studyArea'),
    AnnotationModel.where({
      cameraLocation: req.params.cameraLocationId,
      state: { $in: [AnnotationState.active, AnnotationState.waitForReview] },
    }).countDocuments(),
  ])
    .then(([project, cameraLocation, annotationQuantity]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!cameraLocation) {
        throw new errors.Http404();
      }
      if (cameraLocation.studyArea.state !== StudyAreaState.active) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      if (annotationQuantity > 0) {
        throw new errors.Http400(
          `Can't delete the camera location that has annotations.`,
        );
      }

      cameraLocation.state = CameraLocationState.removed;
      return cameraLocation.save();
    })
    .then(() => {
      res.status(204).send();
    }),
);

exports.lockCameraLocation = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/projects/:projectId/camera-locations/:cameraLocationId/_lock
  Lock the camera location for edit mode.
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    CameraLocationModel.findById(req.params.cameraLocationId)
      .where({ project: req.params.projectId })
      .where({ state: CameraLocationState.active }),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!cameraLocation) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (
        cameraLocation.isLocked() &&
        `${cameraLocation.lockUser._id}` !== `${req.user._id}`
      ) {
        throw new errors.Http400('It already locked by others.');
      }

      cameraLocation.lockExpiredTime = new Date();
      cameraLocation.lockExpiredTime.setMinutes(
        cameraLocation.lockExpiredTime.getMinutes() + 30,
      );
      cameraLocation.lockUser = req.user;
      return cameraLocation.save();
    })
    .then(cameraLocation => {
      res.json(cameraLocation.dump());
    }),
);

exports.unlockCameraLocation = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/projects/:projectId/camera-locations/:cameraLocationId/_unlock
  Unlock the camera location for edit mode.
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    CameraLocationModel.findById(req.params.cameraLocationId)
      .where({ project: req.params.projectId })
      .where({ state: CameraLocationState.active }),
  ])
    .then(([project, cameraLocation]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!cameraLocation) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }
      if (
        cameraLocation.isLocked() &&
        `${cameraLocation.lockUser._id}` !== `${req.user._id}`
      ) {
        throw new errors.Http403('It was locked by others.');
      }

      cameraLocation.lockExpiredTime = undefined;
      cameraLocation.lockUser = undefined;
      return cameraLocation.save();
    })
    .then(cameraLocation => {
      res.json(cameraLocation.dump());
    }),
);
