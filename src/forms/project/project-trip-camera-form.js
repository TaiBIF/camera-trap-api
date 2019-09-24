const forms = require('../');

class ProjectTripCameraForm extends forms.Form {}
ProjectTripCameraForm.define({
  projectCameras: new forms.fields.ArrayField({
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.id()],
    }),
    validators: [
      (values = []) => {
        const camera = new Set();
        for (let index = 0; index < values.length; index += 1) {
          if (camera.has(values[index])) {
            return `${values[index]} is already exist.`;
          }
          camera.add(values[index]);
        }
      },
    ],
  }),
});
module.exports = ProjectTripCameraForm;
