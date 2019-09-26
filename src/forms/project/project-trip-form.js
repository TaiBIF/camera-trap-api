const forms = require('../');

class ProjectTripForm extends forms.Form {}
ProjectTripForm.define({
  sn: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  date: new forms.fields.DateField({
    required: true,
  }),
  member: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  mark: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = ProjectTripForm;
