const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const NotificationModel = require('../models/data/notification-model');
const NotificationsSearchForm = require('../forms/notification/notifications-search-form');
const NotificationType = require('../models/const/notification-type');
const ProjectModel = require('../models/data/project-model');
const StudyAreaModel = require('../models/data/study-area-model');
const CameraLocationModel = require('../models/data/camera-location-model');
require('../models/data/issue-model'); // for populate. todo: remove it after crated issue handler.

exports.getMyNotifications = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/me/notifications
   */
  const form = new NotificationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = NotificationModel.where({ user: req.user._id })
    .where({ type: { $ne: NotificationType.system } })
    .sort(form.sort)
    .populate('dataField')
    .populate('uploadSession')
    .populate('issue')
    .populate('sender');
  if (form.isRead != null) {
    query.where({ isRead: form.isRead });
  }
  return NotificationModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  })
    .then(result =>
      Promise.all([
        result,
        ProjectModel.populate(result.docs, 'uploadSession.project'),
        CameraLocationModel.populate(
          result.docs,
          'uploadSession.cameraLocation',
        ),
      ]),
    )
    .then(([result]) =>
      Promise.all([
        result,
        StudyAreaModel.populate(
          result.docs,
          'uploadSession.cameraLocation.studyArea',
        ),
      ]),
    )
    .then(([result]) =>
      Promise.all([
        result,
        StudyAreaModel.populate(
          result.docs,
          'uploadSession.cameraLocation.studyArea.parent',
        ),
      ]),
    )
    .then(([result]) => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});

exports.readAllMyNotifications = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/me/notifications/_read
   */
  NotificationModel.where({ user: req.user._id, isRead: false })
    .where({ type: { $ne: NotificationType.system } })
    .then(notifications =>
      Promise.all(
        notifications.map(notification => {
          notification.isRead = true;
          return notification.save();
        }),
      ),
    )
    .then(() => {
      res.status(204).send();
    }),
);
