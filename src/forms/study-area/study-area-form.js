const forms = require('../');

class StudyAreaForm extends forms.Form {}
StudyAreaForm.define({
  title: new forms.fields.MultiLanguageField({
    required: true,
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.length({ max: 1024 })],
    }),
  }),
  parent: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
});
module.exports = StudyAreaForm;
