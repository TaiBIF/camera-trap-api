const forms = require('../');

class CameraSerialNumberSearchForm extends forms.Form {}
CameraSerialNumberSearchForm.define({
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraSerialNumberSearchForm;
