const forms = require('../');

class CameraManufacturerSearchForm extends forms.Form {}
CameraManufacturerSearchForm.define({
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraManufacturerSearchForm;
