const auth = require('../auth/authorization');
const errors = require('../models/errors');
const Mail = require('../common/mail');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const CameraLocationAbnormalityModel = require('../models/data/camera-location-abnormality-model');
const CameraLocationAbnormalityForm = require('../forms/camera-location-abnormality/camera-location-abnormality-form');
const NotificationModel = require('../models/data/notification-model');
const NotificationType = require('../models/const/notification-type');

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
      .then(([project]) => {
        if (!project) {
          throw new errors.Http404();
        }
        if (!project.canManageBy(req.user)) {
          throw new errors.Http403();
        }
        const cameraLocationAbnormality = new CameraLocationAbnormalityModel({
          ...form,
          project,
        });
        cameraLocationAbnormality.save();
      })
      .then(([cameraLocationAbnormality, users]) => {
        // Notify camera location abnormality
        const mail = new Mail();
        mail.sendIssueToSystemAdmin(cameraLocationAbnormality, users);

        Promise.all(
          users.map(user => {
            const notification = new NotificationModel({
              user,
              type: NotificationType.cameraLocationAbnormality,
              cameraLocationAbnormality,
            });
            return notification.save();
          }),
        );
      })
      .then(cameraLocationAbnormality => {
        res.json(cameraLocationAbnormality.dump());
      });
  },
);
