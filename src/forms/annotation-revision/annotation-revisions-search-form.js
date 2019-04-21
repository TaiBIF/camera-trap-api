const forms = require('../');

class AnnotationRevisionsSearchForm extends forms.Form {}
AnnotationRevisionsSearchForm.define({
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  size: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(5)(value);
      if (result < 0) {
        return 5;
      }
      if (result > forms.constants.PAGE_SIZE_MAXIMUM) {
        return forms.constants.PAGE_SIZE_MAXIMUM;
      }
      return result;
    },
  }),
  sort: new forms.fields.StringField({
    filter: value => value || '-createTime',
    validators: [forms.validators.regexp(/^-?(createTime)$/)],
  }),
});
module.exports = AnnotationRevisionsSearchForm;
