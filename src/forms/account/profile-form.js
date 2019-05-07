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
  hotkeys: new forms.fields.ArrayField({
    subField: new forms.fields.Field({
      validators: [
        (field = {}) => {
          const lengthValidator = forms.validators.length({
            min: 1,
            max: 1024,
          });
          return (
            lengthValidator(field.speciesTitle) || lengthValidator(field.hotkey)
          );
        },
      ],
    }),
  }),
});
module.exports = ProfileForm;
