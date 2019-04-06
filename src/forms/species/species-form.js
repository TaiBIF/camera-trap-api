const forms = require('../');

class SpeciesForm extends forms.Form {}
SpeciesForm.define({
  id: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  title: new forms.fields.MultiLanguageField({
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.length({ max: 1024 })],
    }),
  }),
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
});
module.exports = SpeciesForm;
