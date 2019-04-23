const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const Mail = require('../common/mail');
const utils = require('../common/utils');
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
    FileModel.findById(form.coverImageFile).where({
      type: FileType.projectCoverImage,
    }),
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
      if (form.coverImageFile && !coverImageFile) {
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
    ProjectModel.findById(req.params.projectId).populate('dataFields'),
    FileModel.findById(form.coverImageFile).where({
      type: FileType.projectCoverImage,
    }),
    DataFieldModel.find({ _id: { $in: form.dataFields } }),
  ])
    .then(([project, coverImageFile, dataFields]) => {
      /*
      - Check the project is exists and req.user have the permission to update it.
      - Check the file is exists and it is a cover image.
      - Check form.dataFields are exists.
      - Check top 5 data fields are system default fields.
      - Copy fields of the form to the project then save it.
      - Assign the project id to coverImageFile.project then save it.
      @param project {ProjectModel}
      @param coverImageFile {FileModel}
      @param dataFields {Array<DataFieldModel>}
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
      if (form.coverImageFile && !coverImageFile) {
        throw new errors.Http400('The cover image file is not found.');
      }
      if (dataFields.length !== form.dataFields.length) {
        throw new errors.Http400('Some data fields are not found.');
      }
      for (let index = 0; index < project.dataFields.length; index += 1) {
        if (!project.dataFields[index].systemCode) {
          break;
        }
        if (`${project.dataFields[index]._id}` !== form.dataFields[index]) {
          throw new errors.Http400(
            `The data fields [${index}] should be ${
              project.dataFields[index]._id
            }.`,
          );
        }
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
  if (!form.user) {
    throw new errors.Http400('user is required.');
  }

  const userQuery = UserModel.find();
  if (form.user.indexOf('@') >= 0) {
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

      project.members.push({
        user,
        role: form.role,
      });
      return Promise.all([user, project.save()]);
    })
    .then(([user, project]) => {
      const mail = new Mail();
      mail
        .sendInviteMemberInToProjectNotification(user, project)
        .catch(error => {
          utils.logError(error, { user: user.dump(), project: project.dump() });
        });
      res.json(project.dump().members);
    });
});

exports.updateProjectMembers = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/members
  Support update and delete, not create.
   */
  const membersDTO = req.body;
  if (!membersDTO || !Array.isArray(membersDTO)) {
    throw new errors.Http400('members: This field is required.');
  }
  if (!membersDTO.length) {
    throw new errors.Http400(`Can't delete all members.`);
  }
  membersDTO.forEach(member => {
    const form = new ProjectMemberForm(member);
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }
  });
  if (!membersDTO.find(x => x.role === ProjectRole.manager)) {
    throw new errors.Http400('Require at least one manager.');
  }

  return ProjectModel.findById(req.params.projectId)
    .populate('members.user')
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

      // update each
      const newMembers = [];
      membersDTO.forEach(updateMemberDTO => {
        const updateMember = project.members.find(
          x => `${x.user._id}` === updateMemberDTO.user,
        );

        if (!updateMember) {
          throw new errors.Http400(
            `User ${updateMemberDTO.user} is not exists.`,
          );
        }
        updateMember.role = updateMemberDTO.role;
        newMembers.push(updateMember);
      });
      project.members = newMembers; // We delete members that are not in the request.
      return project.save();
    })
    .then(project => {
      res.json(project.dump().members);
    });
});
