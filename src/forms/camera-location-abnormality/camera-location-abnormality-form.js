const forms = require('../');
const AbnormalityType = require('../../models/const/abnormality-type');

class CameraLocationAbnormalityForm extends forms.Form {}

CameraLocationAbnormalityForm.define({
  cameraLocation: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  studyArea: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  studySubarea: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  abnormalityStartDate: new forms.fields.DateField(),
  abnormalityEndDate: new forms.fields.DateField(),
  abnormalityType: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(AbnormalityType.all())],
  }),
  note: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});

module.exports = CameraLocationAbnormalityForm;
