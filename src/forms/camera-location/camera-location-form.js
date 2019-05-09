const forms = require('../');

class CameraLocationForm extends forms.Form {}
CameraLocationForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  settingTime: new forms.fields.DateField(),
  latitude: new forms.fields.FloatField({
    required: true,
  }),
  longitude: new forms.fields.FloatField({
    required: true,
  }),
  altitude: new forms.fields.FloatField(),
  vegetation: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  landCoverType: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraLocationForm;
