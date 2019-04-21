const forms = require('../');

class CameraLocationForm extends forms.Form {}
CameraLocationForm.define({
  species: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
});
module.exports = CameraLocationForm;
