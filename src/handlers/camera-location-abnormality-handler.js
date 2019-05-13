const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const CameraLocationAbnormalityModel = require('../models/data/camera-location-abnormality-model');
const CameraLocationAbnormalityForm = require('../forms/camera-location-abnormality/camera-location-abnormality-form');

exports.addCameraLocationAbnormality = auth(
  UserPermission.all(),
  (req, res) => {
    /*
      POST /api/v1/projects/:projectId/camera-location-abnormality
    */
    const form = new CameraLocationAbnormalityForm(req.body);
    const errorMessage = form.validate();

    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }

    return Promise.all([
      ProjectModel.findById(req.params.projectId),
      CameraLocationModel.findById(form.cameraLocation).where({
        project: req.params.projectId,
        state: CameraLocationState.active,
      }),
    ])
      .then(([project, cameraLocation]) => {
        if (!project) {
          throw new errors.Http404();
        }
        if (
          req.user.permission !== UserPermission.administrator &&
          !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
        ) {
          throw new errors.Http403();
        }
        if (!cameraLocation) {
          throw new errors.Http400('The camera location is not exists.');
        }

        const cameraLocationAbnormality = new CameraLocationAbnormalityModel({
          ...form,
          project,
        });
        return cameraLocationAbnormality.save();
      })
      .then(cameraLocationAbnormality => {
        res.json(cameraLocationAbnormality.dump());
      });
  },
);
