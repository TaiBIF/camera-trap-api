const forms = require('../');

class LTDForm extends forms.Form {}
LTDForm.define({
  cameraLocation: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.id()],
  }),
  species: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.id()],
  }),
  startTime: new forms.fields.DateField(),
  endTime: new forms.fields.DateField(),
});
module.exports = LTDForm;
