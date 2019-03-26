const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldForm = require('../forms/data-field/data-field-form');
const DataFieldWidgetType = require('../models/const/data-field-widget-type');
const DataFieldState = require('../models/const/data-field-state');
const DataFieldsSearchForm = require('../forms/data-field/data-fields-search-form');

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

exports.getPublishedDataFields = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/data-fields
   */
  const form = new DataFieldsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = DataFieldModel.where({ state: DataFieldState.published }).sort(
    form.sort,
  );
  return DataFieldModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(new PageList(form.index, form.size, result.total, result.docs));
  });
});
