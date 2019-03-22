const forms = require('../');

class ProfileForm extends forms.Form {}
ProfileForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  email: new forms.fields.StringField({
    validators: [
      forms.validators.email(),
      forms.validators.length({ max: 1024 }),
    ],
  }),
});
module.exports = ProfileForm;
