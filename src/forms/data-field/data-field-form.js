const forms = require('../');
const DataFieldWidgetType = require('../../models/const/data-field-widget-type');

class DataFieldForm extends forms.Form {}
DataFieldForm.define({
  title: new forms.fields.MultiLanguageField({
    required: true,
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.length({ max: 1024 })],
    }),
  }),
  widgetType: new forms.fields.StringField({
    validators: [forms.validators.anyOf(DataFieldWidgetType.all())],
  }),
  description: new forms.fields.MultiLanguageField({
    subField: new forms.fields.StringField({
      validators: [forms.validators.length({ max: 1024 })],
    }),
  }),
  options: new forms.fields.ArrayField({
    subField: new forms.fields.MultiLanguageField({
      required: true,
      subField: new forms.fields.StringField({
        required: true,
        validators: [forms.validators.length({ max: 1024 })],
      }),
    }),
  }),
  note: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = DataFieldForm;
