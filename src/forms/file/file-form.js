const forms = require('../');
const FileType = require('../../models/const/file-type');

class FileForm extends forms.Form {}
FileForm.define({
  type: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.anyOf(FileType.all())],
  }),
});
module.exports = FileForm;
