const forms = require('../');

class CameraLocationForm extends forms.Form {}
CameraLocationForm.define({
  // For duplicate an annotation.
  cameraLocation: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  file: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  filename: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  time: new forms.fields.DateField(),
  // -----

  species: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  fields: new forms.fields.ArrayField({
    subField: new forms.fields.Field({
      validators: [
        (field = {}) => {
          const idValidator = forms.validators.id();
          const lengthValidator = forms.validators.length({ max: 1024 });
          return idValidator(field.dataField) || lengthValidator(field.value);
        },
      ],
    }),
  }),
});
module.exports = CameraLocationForm;
