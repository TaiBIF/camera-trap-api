const forms = require('../');

class DataFieldsSearchForm extends forms.Form {}
DataFieldsSearchForm.define({
  filter: new forms.fields.StringField({
    validators: [forms.validators.anyOf(['system', 'custom'])],
  }),
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
  sort: new forms.fields.StringField({
    filter: value => value || 'createTime',
    validators: [forms.validators.regexp(/^-?(createTime)$/)],
  }),
});
module.exports = DataFieldsSearchForm;
