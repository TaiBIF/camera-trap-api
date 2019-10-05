const forms = require('../');

class CameraModelSearchForm extends forms.Form {}
CameraModelSearchForm.define({
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraModelSearchForm;
