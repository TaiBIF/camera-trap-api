const forms = require('../');

class NotificationsSearchForm extends forms.Form {}
NotificationsSearchForm.define({
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  size: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(20)(value);
      if (result < 0) {
        return 20;
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
  isRead: new forms.fields.BooleanField(),
});
module.exports = NotificationsSearchForm;
