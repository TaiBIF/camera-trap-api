const forms = require('../');

class ProjectCameraForm extends forms.Form {}
ProjectCameraForm.define({
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
  manufacturer: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  model: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  batteryType: new forms.fields.DateField(),
  brightness: new forms.fields.FloatField(),
  sensitivity: new forms.fields.FloatField(),
  videoLength: new forms.fields.IntegerField(),
  continuousShots: new forms.fields.IntegerField(),
  state: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
});
module.exports = ProjectCameraForm;
