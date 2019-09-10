const forms = require('../');

class CameraForm extends forms.Form {}
CameraForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  sn: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  vn: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  factory: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  model: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  state: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
});
module.exports = CameraForm;
