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
    filter: value => value || [],
    subField: new forms.fields.Field({
      validators: [
        (field = {}) => {
          const idValidator = forms.validators.id();
          const lengthValidator = forms.validators.length({
            min: 1,
            max: 1024,
          });
          return idValidator(field.species) || lengthValidator(field.hotkey);
        },
      ],
    }),
  }),
});
module.exports = ProfileForm;
