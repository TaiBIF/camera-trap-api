const forms = require('../');
const GeodeticDatum = require('../../models/const/geodetic-datum');

class CameraLocationForm extends forms.Form {}
CameraLocationForm.define({
  name: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  settingTime: new forms.fields.DateField(),
  retireTime: new forms.fields.DateField(),
  latitude: new forms.fields.FloatField({
    required: true,
  }),
  longitude: new forms.fields.FloatField({
    required: true,
  }),
  geodeticDatum: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(GeodeticDatum.all())],
  }),
  altitude: new forms.fields.FloatField(),
  vegetation: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  landCoverType: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  verbatimLocality: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  remarks: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraLocationForm;
