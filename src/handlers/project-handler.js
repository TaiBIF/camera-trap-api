const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectRole = require('../models/const/project-role');
const ProjectModel = require('../models/data/project-model');
const ProjectsSearchForm = require('../forms/project/projects-search-form');
const ProjectForm = require('../forms/project/project-form');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldSystemCode = require('../models/const/data-field-system-code');
const SpeciesModel = require('../models/data/species-model');
const SpeciesCode = require('../models/const/species-code');

exports.getProjects = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects
   */
  const form = new ProjectsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectModel.where()
    .populate('members.user')
    .populate('dataFields')
    .sort(form.sort);
  if (req.user.permission !== UserPermission.administrator) {
    // General accounts just fetch hims' projects. (Administrator fetch all projects.)
    query.where({ 'members.user': req.user._id });
  }
  return ProjectModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(new PageList(form.index, form.size, result.totalDocs, result.docs));
  });
});

exports.addProject = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects
   */
  const form = new ProjectForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return DataFieldModel.where({ systemCode: { $exists: true } })
    .then(dataFields => {
      const getDataFieldByCode = code => {
        for (let index = 0; index < dataFields.length; index += 1) {
          if (dataFields[index].systemCode === code) {
            return dataFields[index];
          }
        }
      };

      const project = new ProjectModel({
        ...form,
        members: [
          {
            user: req.user,
            role: ProjectRole.manager,
          },
        ],
        dataFields: [
          getDataFieldByCode(DataFieldSystemCode.studyArea),
          getDataFieldByCode(DataFieldSystemCode.cameraLocation),
          getDataFieldByCode(DataFieldSystemCode.fileName),
          getDataFieldByCode(DataFieldSystemCode.time),
          getDataFieldByCode(DataFieldSystemCode.species),
        ],
      });
      return project.save();
    })
    .then(project => {
      // Add default species.
      const species = [
        new SpeciesModel({
          project,
          code: SpeciesCode.emptyShot,
          title: {
            'zh-TW': '空拍',
          },
          index: 0,
        }),
        new SpeciesModel({
          project,
          code: SpeciesCode.test,
          title: {
            'zh-TW': '測試',
          },
          index: 1,
        }),
        new SpeciesModel({
          project,
          code: SpeciesCode.people,
          title: {
            'zh-TW': '人',
          },
          index: 2,
        }),
      ];
      const result = species.map(doc => doc.save());
      result.unshift(project);
      return Promise.all(result);
    })
    .then(([project]) => {
      res.json(project.dump());
    });
});
