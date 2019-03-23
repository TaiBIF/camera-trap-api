const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectRole = require('../models/const/project-role');
const ProjectModel = require('../models/data/project-model');
const ProjectsSearchForm = require('../forms/project/projects-search-form');
const ProjectForm = require('../forms/project/project-form');

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
    .sort(form.sort);
  if (req.user.permission !== UserPermission.administrator) {
    // General accounts just fetch hims' projects. (Administrator fetch all projects.)
    query.where({ 'members.user': req.user._id });
  }
  return ProjectModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(new PageList(form.index, form.size, result.total, result.docs));
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

  const project = new ProjectModel({
    title: form.title,
    members: [
      {
        user: req.user,
        role: ProjectRole.manager,
      },
    ],
  });
  return project.save().then(() => {
    res.json(project.dump());
  });
});
