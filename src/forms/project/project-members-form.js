const forms = require('../');
const ProjectRole = require('../../models/const/project-role');
const ProjectMemberForm = require('./project-member-form');

class ProjectMembersForm extends forms.Form {}
ProjectMembersForm.define({
  members: new forms.fields.ArrayField({
    subField: new ProjectMemberForm()
  })
});
module.exports = ProjectMembersForm;
