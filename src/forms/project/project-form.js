const forms = require('../');

class ProjectForm extends forms.Form {}
ProjectForm.define({
  title: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = ProjectForm;
