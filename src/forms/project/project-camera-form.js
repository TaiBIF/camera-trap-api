const forms = require('../');

class ProjectCameraForm extends forms.Form {}
ProjectCameraForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  sn: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  vn: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  manufacturer: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  model: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  batteryType: new forms.fields.StringField(),
  brightness: new forms.fields.StringField(),
  sensitivity: new forms.fields.StringField(),
  videoLength: new forms.fields.IntegerField(),
  continuousShots: new forms.fields.IntegerField(),
  state: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = ProjectCameraForm;
