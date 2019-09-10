const forms = require('../');

class CameraSerialNumberForm extends forms.Form {}
CameraSerialNumberForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  dataCount: new forms.fields.IntegerField(),
});
module.exports = CameraSerialNumberForm;
