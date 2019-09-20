const forms = require('../');

class ProjectCamerasSearchForm extends forms.Form {}
ProjectCamerasSearchForm.define({
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  size: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(24)(value);
      if (result < 0) {
        return 24;
      }
      if (result > forms.constants.PAGE_SIZE_MAXIMUM) {
        return forms.constants.PAGE_SIZE_MAXIMUM;
      }
      return result;
    },
  }),
  sort: new forms.fields.StringField({
    filter: value => value || 'name',
    validators: [forms.validators.regexp(/^-?(name)|(sn)|(vn)|(model)$/)],
  }),
});
module.exports = ProjectCamerasSearchForm;
