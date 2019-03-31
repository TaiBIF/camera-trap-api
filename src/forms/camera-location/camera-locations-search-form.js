const forms = require('../');

class CameraLocationsSearchForm extends forms.Form {}
CameraLocationsSearchForm.define({
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
    filter: value => value || 'name',
    validators: [forms.validators.regexp(/^-?(name)$/)],
  }),
  name: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
});
module.exports = CameraLocationsSearchForm;
