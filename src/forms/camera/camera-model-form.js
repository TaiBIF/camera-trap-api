const forms = require('../');

class CameraModelForm extends forms.Form {}
CameraModelForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  dataCount: new forms.fields.IntegerField(),
});
module.exports = CameraModelForm;
