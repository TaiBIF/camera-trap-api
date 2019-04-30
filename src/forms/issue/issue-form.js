const forms = require('../');
const IssueType = require('../../models/const/issue-type');
const IssueCategory = require('../../models/const/issue-category');

class IssueForm extends forms.Form {}
IssueForm.define({
  type: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(IssueType.all())],
  }),
  category: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(IssueCategory.all())],
  }),
  description: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  email: new forms.fields.StringField({
    required: true,
    validators: [
      forms.validators.email(),
      forms.validators.length({ max: 1024 }),
    ],
  }),
  attachmentFile: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
});
module.exports = IssueForm;
