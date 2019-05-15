const forms = require('../');

class ForestCompartmentBoundaryForm extends forms.Form {}
ForestCompartmentBoundaryForm.define({
  decimalLongitude: new forms.fields.FloatField({
    required: true,
  }),
  decimalLatitude: new forms.fields.FloatField({
    required: true,
  }),
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
      // TODO-MG
      //if (result > forms.constants.ANNOTATION_SIZE_MAXIMUM) {
      //  return forms.constants.ANNOTATION_SIZE_MAXIMUM;
      //}
      return result;
    },
  }),
});
module.exports = ForestCompartmentBoundaryForm;
