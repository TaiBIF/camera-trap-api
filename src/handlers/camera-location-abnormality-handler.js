const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
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

    return ProjectModel.findById(req.params.projectId)
      .then(project => {
        if (!project) {
          throw new errors.Http404();
        }
        if (
          req.user.permission !== UserPermission.administrator &&
          !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
        ) {
          throw new errors.Http403();
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
