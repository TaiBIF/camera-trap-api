const forms = require('../');
const ProjectLicense = require('../../models/const/project-license');

class ProjectForm extends forms.Form {}
ProjectForm.define({
  title: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  shortTitle: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 4 })],
  }),
  funder: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  code: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  principalInvestigator: new forms.fields.StringField({
    required: true,
    validators: [forms.validators.length({ max: 1024 })],
  }),
  startTime: new forms.fields.DateField({
    required: true,
  }),
  endTime: new forms.fields.DateField({
    required: true,
  }),
  areas: new forms.fields.ArrayField({
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.id()],
    }),
    validators: [
      (values = []) => {
        const areas = new Set();
        for (let index = 0; index < values.length; index += 1) {
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
  coverImageFile: new forms.fields.StringField({
    validators: [forms.validators.id()],
  }),
  publishTime: new forms.fields.DateField(),
  interpretiveDataLicense: new forms.fields.StringField({
    validators: [
      forms.validators.anyOf([
        ProjectLicense.publicDomain,
        ProjectLicense.attributionOnly,
        ProjectLicense.attributionAndNoncommercial,
      ]),
    ],
  }),
  identificationInformationLicense: new forms.fields.StringField({
    validators: [forms.validators.anyOf([ProjectLicense.attributionOnly])],
  }),
  videoMaterialLicense: new forms.fields.StringField({
    validators: [
      forms.validators.anyOf([
        ProjectLicense.publicDomain,
        ProjectLicense.attributionOnly,
        ProjectLicense.attributionAndNoncommercial,
      ]),
    ],
  }),
  dataFields: new forms.fields.ArrayField({
    subField: new forms.fields.StringField({
      required: true,
      validators: [forms.validators.id()],
    }),
    validators: [
      (values = []) => {
        const fields = new Set();
        for (let index = 0; index < values.length; index += 1) {
          if (fields.has(values[index])) {
            return `${values[index]} is already exist.`;
          }
          fields.add(values[index]);
        }
      },
    ],
  }),
  dailyTestTime: new forms.fields.StringField({
    validators: [forms.validators.regexp(/\d{2}:\d{2}:\d{2}/)],
  }),
});
module.exports = ProjectForm;
