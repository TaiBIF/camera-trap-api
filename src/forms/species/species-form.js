const forms = require('../');

class SpeciesForm extends forms.Form {}
SpeciesForm.define({
  title: new forms.fields.MultiLanguageField({
    required: true,
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
