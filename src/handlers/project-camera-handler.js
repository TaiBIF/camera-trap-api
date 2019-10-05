const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectCameraModel = require('../models/data/project-camera-model');
const ProjectCameraForm = require('../forms/project/project-camera-form');
const ProjectCamerasSearchForm = require('../forms/project/project-camera-search-form');
const CameraModel = require('../models/data/camera-model');
const CameraState = require('../models/const/camera-state');
const ProjectModel = require('../models/data/project-model');

exports.getProjectCameras = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/project/{projectId}/cameras
   */
  const form = new ProjectCamerasSearchForm(req.query);
  const { projectId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectCameraModel.where({
    project: projectId,
    // state: ProjectCameraState.active,
  }).sort(form.sort);
  return ProjectCameraModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.getProjectCameraByCameraId = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/project/{projectId}/cameras/{cameraId}
   */
  const form = new ProjectCamerasSearchForm(req.query);
  const { projectId, cameraId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectCameraModel.where({
    project: projectId,
    _id: cameraId,
    // state: ProjectCameraState.active,
  }).sort(form.sort);
  return ProjectCameraModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.addProjectCamera = auth(UserPermission.all(), (req, res) => {
  /*
POST /api/v1/projects/{projectId}/cameras
 */
  const form = new ProjectCameraForm(req.body);
  const { projectId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(projectId),
    ProjectCameraModel.where({ project: projectId, name: form.name }).findOne(),
    CameraModel.findOne({
      // project: projectId,
      name: form.name,
      sn: form.sn,
      vn: form.vn,
      manufacturer: form.manufacturer,
      model: form.model,
      state: CameraState.active,
    }),
  ])
    .then(([project, projectCameraFields, cameraExist]) => {
      if (!cameraExist) {
        throw new errors.Http404('Cannot find camera model');
      }
      if (projectCameraFields) {
        throw new errors.Http400('Cannot recreat project camera');
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      const result = new ProjectCameraModel({
        project: projectId,
        status: CameraState.active,
        nickname: form.name,
        ...form,
      });
      return Promise.all([result.save()]);
    })
    .then(([project]) => {
      res.json(project.dump());
    });
});

exports.updateProjectCamera = auth(UserPermission.all(), (req, res) => {
  /*
PUT /api/v1/projects/{projectId}/cameras/{cameraId}
 */
  const form = new ProjectCameraForm(req.body);
  const { projectId, cameraId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(projectId),
    ProjectCameraModel.findById(cameraId).where({ project: projectId }),
  ])
    .then(([project, projectCamera]) => {
      if (!projectCamera) {
        throw new errors.Http404('Cannot find project camera');
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      Object.assign(projectCamera, form);
      return projectCamera.save();
    })
    .then(projectCamera => {
      res.json(projectCamera.dump());
    });
});

exports.deleteProjectCameraByCameraId = auth(
  UserPermission.all(),
  (req, res) => {
    /*
Delete /api/v1/projects/{projectId}/cameras/{cameraId}
 */
    const { projectId, cameraId } = req.params;

    return Promise.all([
      ProjectModel.findById(projectId),
      ProjectCameraModel.findById(cameraId).where({
        project: projectId,
      }),
    ])
      .then(([project, projectCamera]) => {
        if (!projectCamera) {
          throw new errors.Http404('Cannot find project camera');
        }
        if (!project.canManageBy(req.user)) {
          throw new errors.Http403();
        }
        projectCamera.state = CameraState.removed;
        return projectCamera.save();
      })
      .then(() => {
        res.status(204).send();
      });
  },
);
