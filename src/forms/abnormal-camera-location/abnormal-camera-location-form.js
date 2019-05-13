const forms = require('../');
const AbnormalType = require('../../models/const/abnormal-type');

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
  abnormalStartDate: new forms.fields.DateField(),
  abnormalEndDate: new forms.fields.DateField(),
  abnormalType: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(AbnormalType.all())],
  }),
  note: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});

module.exports = CameraLocationAbnormalityForm;
