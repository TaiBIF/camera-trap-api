const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectRole = require('../models/const/project-role');
const ProjectAreaModel = require('../models/data/project-area-model');
const ProjectModel = require('../models/data/project-model');
const ProjectsSearchForm = require('../forms/project/projects-search-form');
const ProjectMemberForm = require('../forms/project/project-member-form');
const ProjectForm = require('../forms/project/project-form');
const UserModel = require('../models/data/user-model');
const DataFieldModel = require('../models/data/data-field-model');
const DataFieldSystemCode = require('../models/const/data-field-system-code');
const SpeciesModel = require('../models/data/species-model');
const SpeciesCode = require('../models/const/species-code');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');

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
    .sort(form.sort)
    .populate('coverImageFile');
  if (req.user.permission !== UserPermission.administrator) {
    // General accounts just fetch hims' projects. (Administrator fetch all projects.)
    query.where({ 'members.user': req.user._id });
  }
  return ProjectModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.getProject = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/projects/:projectId
   */
  ProjectModel.findById(req.params.projectId)
    .populate('coverImageFile')
    .populate('areas')
    .populate('members.user')
    .populate('dataFields')
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        req.user.permission !== UserPermission.administrator &&
        !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
      ) {
        throw new errors.Http403();
      }

      res.json(project.dump());
    }),
);

exports.addProject = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects
   */
  const form = new ProjectForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    DataFieldModel.where({ systemCode: { $exists: true } }),
    ProjectAreaModel.find({ _id: { $in: form.areas } }),
    FileModel.findById(form.coverImageFile),
  ])
    .then(([dataFields, projectAreas, coverImageFile]) => {
      /*
      - Check the file is exists and it is a cover image.
      - Create a new project with the form.
      - Add req.user into the project.members.
      - Add system data fields at the new project.
      @param dataFields {Array<DataFieldModel>} System data fields.
      @param projectAreas {Array<ProjectAreaModel>}
      @param coverImageFile {FileModel}
      @returns {Promise<[{ProjectModel}, {FileModel}]>}
       */
      if (
        form.coverImageFile &&
        (!coverImageFile || coverImageFile.type !== FileType.projectCoverImage)
      ) {
        throw new errors.Http400('The cover image file is not found.');
      }

      const project = new ProjectModel({
        ...form,
        coverImageFile,
        areas: projectAreas,
        members: [
          {
            user: req.user,
            role: ProjectRole.manager,
          },
        ],
        dataFields: [
          dataFields.find(x => x.systemCode === DataFieldSystemCode.studyArea),
          dataFields.find(
            x => x.systemCode === DataFieldSystemCode.cameraLocation,
          ),
          dataFields.find(x => x.systemCode === DataFieldSystemCode.fileName),
          dataFields.find(x => x.systemCode === DataFieldSystemCode.time),
          dataFields.find(x => x.systemCode === DataFieldSystemCode.species),
        ],
      });
      return Promise.all([project.save(), coverImageFile]);
    })
    .then(([project, coverImageFile]) => {
      /*
      - Add default species (空拍, 測試, 人) for this project.
      - Add coverImageFile.project and save it.
      @param project {ProjectModel}
      @param coverImageFile {FileModel}
      @returns {Promises<[{ProjectModel}]>}
       */
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
      if (coverImageFile) {
        coverImageFile.project = project;
        result.push(coverImageFile.save());
      }
      result.unshift(project);
      return Promise.all(result);
    })
    .then(([project]) => {
      res.json(project.dump());
    });
});

exports.updateProject = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId
   */
  const form = new ProjectForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    FileModel.findById(form.coverImageFile),
  ])
    .then(([project, coverImageFile]) => {
      /*
      - Check the project is exists and req.user have the permission to update it.
      - Check the file is exists and it is a cover image.
      - Copy fields of the form to the project then save it.
      - Assign the project id to coverImageFile.project then save it.
      @param project {ProjectModel}
      @param coverImageFile {FileModel}
      @returns {Promise<[{ProjectModel}]>}
       */
      if (!project) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }
      if (
        form.coverImageFile &&
        (!coverImageFile || coverImageFile.type !== FileType.projectCoverImage)
      ) {
        throw new errors.Http400('The cover image file is not found.');
      }

      Object.assign(project, form);
      const tasks = [project.save()];
      if (coverImageFile) {
        coverImageFile.project = project;
        tasks.push(coverImageFile.save());
      }
      return Promise.all(tasks);
    })
    .then(() => exports.getProject(req, res));
});

exports.addProjectMember = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects/:projectId/members
   */
  const form = new ProjectMemberForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const userQuery = UserModel.find();
  if (form.user.indexOf('@')) {
    userQuery.where({ email: form.user });
  } else {
    userQuery.where({ orcId: form.user });
  }
  return Promise.all([
    ProjectModel.findById(req.params.projectId).populate('members.user'),
    userQuery.findOne(),
  ])
    .then(([project, user]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!user) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }
      if (project.members.find(x => `${x.user._id}` === `${user._id}`)) {
        throw new errors.Http400(`User ${user._id} is already exists.`);
      }
      if (
        form.role === ProjectRole.manager &&
        project.members.find(x => x.role === ProjectRole.manager)
      ) {
        // 一個計劃限制只能一個管理員
        throw new errors.Http400('Can not add more managers.');
      }

      project.members.push({
        user,
        role: form.role,
      });
      return project.save();
    })
    .then(project => {
      res.json(project.dump().members);
    });
});

exports.deleteProjectMember = auth(UserPermission.all(), (req, res) =>
  /*
  DELETE /api/v1/projects/:projectId/members/:userId
   */
  ProjectModel.findById(req.params.projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
        throw new errors.Http403();
      }

      const memberIndex = project.members.findIndex(
        x => `${x.user._id}` === req.params.userId,
      );
      if (memberIndex < 0) {
        throw new errors.Http400(`User ${req.params.userId} is not exists.`);
      }
      if (project.members[memberIndex].role === ProjectRole.manager) {
        throw new errors.Http400('Can nat delete the manager.');
      }
      project.members.splice(memberIndex, 1);
      return project.save();
    })
    .then(() => {
      res.status(204).send();
    }),
);
