const forms = require('../');
const ProjectArea = require('../../models/const/project-area');
const ProjectLicense = require('../../models/const/project-license');

class ProjectForm extends forms.Form {}
ProjectForm.define({
  title: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  shortTitle: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  funder: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  code: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  principalInvestigator: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  startTime: new forms.fields.DateField(),
  endTime: new forms.fields.DateField(),
  areas: new forms.fields.Field({
    filter: value => (value == null ? [] : value),
    validators: [
      (values = []) => {
        if (!Array.isArray(values)) {
          return 'This field should be array.';
        }
        const allAreas = ProjectArea.all();
        if (values.length > allAreas.length) {
          return `The length limited of this field is ${allAreas.length}`;
        }
        const areas = new Set();
        for (let index = 0; index < values.length; index += 1) {
          if (allAreas.indexOf(values[index]) < 0) {
            return `${values[index]} is invalid.`;
          }
          if (areas.has(values[index])) {
            return `${values[index]} is already exist.`;
          }
          areas.add(values[index]);
        }
      },
    ],
  }),
  description: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  note: new forms.fields.StringField({
    validators: [forms.validators.length({ max: 1024 })],
  }),
  coverImageFilename: new forms.fields.StringField({
    validators: [forms.validators.regexp(/^[a-f\d]{24}\.(jpg)|(png)$/)],
  }),
  publishTime: new forms.fields.DateField(),
  interpretiveDataLicense: new forms.fields.StringField({
    validators: [
      forms.validators.anyOf([
        ProjectLicense.freeingContent,
        ProjectLicense.attributionAlone,
        ProjectLicense.attributionAndNoncommercial,
      ]),
    ],
  }),
  identificationInformationLicense: new forms.fields.StringField({
    validators: [forms.validators.anyOf([ProjectLicense.attributionAlone])],
  }),
  videoMaterialLicense: new forms.fields.StringField({
    validators: [
      forms.validators.anyOf([
        ProjectLicense.freeingContent,
        ProjectLicense.attributionAlone,
        ProjectLicense.attributionAndNoncommercial,
      ]),
    ],
  }),
});
module.exports = ProjectForm;
