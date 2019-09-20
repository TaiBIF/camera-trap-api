const forms = require('../');

class CameraVendorMaintenanceNumberSearchForm extends forms.Form {}
CameraVendorMaintenanceNumberSearchForm.define({
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraVendorMaintenanceNumberSearchForm;
