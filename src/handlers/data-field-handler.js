const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldForm = require('../forms/data-field/data-field-form');
const DataFieldWidgetType = require('../models/const/data-field-widget-type');

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

  const dataField = new DataFieldModel({
    ...form,
    user: req.user,
  });
  return dataField.save(() => {
    res.json(dataField.dump());
  });
});
