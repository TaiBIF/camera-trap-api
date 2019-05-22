const forms = require('../');

class OIForm extends forms.Form {}
OIForm.define({
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
  validTimeInterval: new forms.fields.IntegerField({
    // 有效時間判定間隔。單位：毫秒
    required: true,
  }),
  eventTimeInterval: new forms.fields.IntegerField({
    // 目擊事件判斷間隔。單位：毫秒
    required: true,
  }),
});
module.exports = OIForm;
