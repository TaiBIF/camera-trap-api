const forms = require('../');
const ProjectRole = require('../../models/const/project-role');

class ProjectMemberForm extends forms.Form {}
ProjectMemberForm.define({
  user: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  role: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(ProjectRole.all())],
  }),
});
module.exports = ProjectMemberForm;
