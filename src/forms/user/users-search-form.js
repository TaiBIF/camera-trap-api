const forms = require('../');

class UsersSearchForm extends forms.Form {}
UsersSearchForm.define({
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  size: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(forms.constants.PAGE_SIZE_MAXIMUM)(
        value,
      );
      if (result < 0) {
        return forms.constants.PAGE_SIZE_MAXIMUM;
      }
      if (result > forms.constants.PAGE_SIZE_MAXIMUM) {
        return forms.constants.PAGE_SIZE_MAXIMUM;
      }
      return result;
    },
  }),
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  orcid: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  email: new forms.fields.StringField({
    validators: [
      forms.validators.email(),
      forms.validators.length({ max: 1024 }),
    ],
  }),
});
module.exports = UsersSearchForm;
