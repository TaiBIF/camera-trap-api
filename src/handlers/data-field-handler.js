const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserModel = require('../models/data/user-model');
const UserPermission = require('../models/const/user-permission');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldForm = require('../forms/data-field/data-field-form');
const DataFieldWidgetType = require('../models/const/data-field-widget-type');
const DataFieldState = require('../models/const/data-field-state');
const DataFieldsSearchForm = require('../forms/data-field/data-fields-search-form');
const NotificationModel = require('../models/data/notification-model');
const NotificationType = require('../models/const/notification-type');

exports.addDataField = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/data-fields
   */
  const form = new DataFieldForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  if (
    form.widgetType === DataFieldWidgetType.select &&
    form.options.length <= 0
  ) {
    throw new errors.Http400(
      'Options is required when the widget type is select.',
    );
  }

  return UserModel.where({ permission: UserPermission.administrator })
    .then(administrators => {
      const dataField = new DataFieldModel({
        ...form,
        user: req.user,
      });
      const tasks = [dataField.save()];
      administrators.forEach(administrator => {
        const notification = new NotificationModel({
          sender: req.user,
          user: administrator,
          type: NotificationType.dataFieldApplication,
          dataField,
        });
        tasks.push(notification.save());
      });
      return Promise.all(tasks);
    })
    .then(([dataField]) => {
      res.json(dataField.dump());
    });
});

exports.addDataFieldApprove = auth(UserPermission.administrator, (req, res) =>
  /*
  POST /api/v1/data-fields/:dataFieldId/_approve
  */
  DataFieldModel.findById(req.params.dataFieldId)
    .where({ state: DataFieldState.waitForReview })
    .then(dataField => {
      if (!dataField) {
        throw new errors.Http404();
      }
      dataField.state = DataFieldState.approved;
      return dataField.save();
    })
    .then(dataField => {
      res.json(dataField.dump());
    }),
);

exports.addDataFieldReject = auth(UserPermission.administrator, (req, res) =>
  /*
  POST /api/v1/data-fields/:dataFieldId/_reject
  */
  DataFieldModel.findById(req.params.dataFieldId)
    .where({ state: DataFieldState.waitForReview })
    .then(dataField => {
      if (!dataField) {
        throw new errors.Http404();
      }
      dataField.state = DataFieldState.rejected;
      return dataField.save();
    })
    .then(dataField => {
      res.json(dataField.dump());
    }),
);

exports.getPublishedDataFields = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/data-fields
   */
  const form = new DataFieldsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = DataFieldModel.where({ state: DataFieldState.approved }).sort(
    form.sort,
  );
  if (form.filter === 'system') {
    query.where({ systemCode: { $exists: true } });
  } else if (form.filter === 'custom') {
    query.where({ systemCode: { $exists: false } });
  }
  return DataFieldModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.getPublishedDataField = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/data-fields/:dataFieldId
   */
  DataFieldModel.findById(req.params.dataFieldId)
    .where({ state: DataFieldState.approved })
    .then(dataField => {
      if (!dataField) {
        throw new errors.Http404();
      }
      res.json(dataField.dump());
    }),
);
