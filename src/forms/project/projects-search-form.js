const forms = require('../');

class ProjectsSearchForm extends forms.Form {}
ProjectsSearchForm.define({
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
    filter: value => value || 'oldestAnnotationTime',
    validators: [
      forms.validators.regexp(
        /^-?(oldestAnnotationTime)|(latestAnnotationTime)|(funder)|(title)$/,
      ),
    ],
  }),
});
module.exports = ProjectsSearchForm;
