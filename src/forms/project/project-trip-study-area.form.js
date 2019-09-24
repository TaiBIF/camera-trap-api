const forms = require('../');

class ProjectTripStudyAreaForm extends forms.Form {}
ProjectTripStudyAreaForm.define({
  studyAreas: new forms.fields.Field({
    studyArea: new forms.fields.StringField({
      validators: [forms.validators.id()],
    }),
    cameraLocations: new forms.fields.ArrayField({
      filter: value => value || [],
      subField: new forms.fields.Field({
        validators: [
          (field = {}) =>
            // const idValidator = forms.validators.id();
            field.projectCameras,
        ],
      }),
    }),
  }),
});
module.exports = ProjectTripStudyAreaForm;
