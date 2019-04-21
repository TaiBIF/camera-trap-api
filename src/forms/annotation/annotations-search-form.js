const forms = require('../');

class AnnotationsSearchForm extends forms.Form {}
AnnotationsSearchForm.define({
  studyArea: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  cameraLocations: new forms.fields.ArrayField({
    filter: value => (Array.isArray(value) ? value : [value]),
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.id()],
    }),
  }),
  startTime: new forms.fields.DateField(),
  endTime: new forms.fields.DateField(),
  index: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(0)(value);
      return result < 0 ? 0 : result;
    },
  }),
  size: new forms.fields.IntegerField({
    filter: value => {
      const result = forms.filters.integer(forms.constants.PAGE_SIZE_MAXIMUM)(
        value,
      );
      if (result < 0) {
        return forms.constants.PAGE_SIZE_MAXIMUM;
      }
      if (result > forms.constants.ANNOTATION_SIZE_MAXIMUM) {
        return forms.constants.ANNOTATION_SIZE_MAXIMUM;
      }
      return result;
    },
  }),
  sort: new forms.fields.StringField({
    filter: value => value || 'cameraLocation time filename',
    validators: [
      (value = '') => {
        const items = value.split(' ');
        for (let index = 0; index < items.length; index += 1) {
          if (items[index][0] === '-') {
            items[index] = items[index].replace('-', '');
          }
          if (
            ['cameraLocation', 'time', 'filename'].indexOf(items[index]) < 0
          ) {
            return 'Just allow cameraLocation, time and filename.';
          }
        }
      },
    ],
  }),
});
module.exports = AnnotationsSearchForm;
