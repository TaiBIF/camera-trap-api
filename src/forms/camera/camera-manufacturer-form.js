const forms = require('../');

class CameraManufacturerForm extends forms.Form {}
CameraManufacturerForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  dataCount: new forms.fields.IntegerField(),
});
module.exports = CameraManufacturerForm;
