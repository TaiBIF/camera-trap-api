const forms = require('../');

class AbnormalCameraLocationForm extends forms.Form {}

AbnormalCameraLocationForm.define({
  studyArea: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  studySubarea: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  abnormalStartDate: new forms.fields.DateField(),
  abnormalEndDate: new forms.fields.DateField(),
  remarks: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = AbnormalCameraLocationForm;
