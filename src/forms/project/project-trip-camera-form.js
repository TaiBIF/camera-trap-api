const forms = require('../');

class ProjectTripStudyAreaForm extends forms.Form {}
ProjectTripStudyAreaForm.define({
  cameraLocationMark: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  cameraSn: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  cameraBatteryType: new forms.fields.StringField(),
  // 電池剩餘電量
  cameraBatteryRemainingCapacity: new forms.fields.StringField(),
  cameraBrightness: new forms.fields.StringField(),
  cameraSensitivity: new forms.fields.StringField(),
  cameraVideoLength: new forms.fields.IntegerField(),
  cameraContinuousShots: new forms.fields.IntegerField(),
  cameraSensingDistance: new forms.fields.IntegerField(),
  cameraState: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  // 相機註記
  cameraMark: new forms.fields.StringField(),
  // 記憶卡檔案數
  cameraMemoryCardNumber: new forms.fields.IntegerField(),
  // 相機方位
  cameraPosition: new forms.fields.StringField(),
  // 相機俯角
  cameraDepressionAngle: new forms.fields.StringField(),
  // 感應距離
  sensingDistance: new forms.fields.StringField(),
  // 有效開始時間
  startActiveDate: new forms.fields.DateField(),
  endActiveDate: new forms.fields.DateField(),
});
module.exports = ProjectTripStudyAreaForm;
