const forms = require('../');

class IssueForm extends forms.Form {}
IssueForm.define({
  type: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  category: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  
  type: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  category: new forms.fields.IntegerField({
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
  description: new forms.fields.StringField({
    filter: value => value || 'title.zh-TW',
    validators: [forms.validators.regexp(/^-?(title\.zh-TW)|(title\.en-US)$/)],
  }),
  description: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),

  coverImageFile: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),  
});
module.exports = ProjectAreasSearchForm;
