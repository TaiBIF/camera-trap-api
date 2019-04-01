const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const ProjectRole = require('../models/const/project-role');
const SpeciesModel = require('../models/data/species-model');
const SpeciesSearchForm = require('../forms/species/species-search-form');
const SpeciesForm = require('../forms/species/species-form');

exports.getProjectSpecies = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/species
   */
  const form = new SpeciesSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return ProjectModel.findById(req.params.projectId)
    .then(project => {
      if (!project) {
        throw new errors.Http404();
      }
      if (
        req.user.permission !== UserPermission.administrator &&
        project.members.map(x => `${x.user._id}`).indexOf(`${req.user._id}`) < 0
      ) {
        throw new errors.Http403();
      }
      return project;
    })
    .then(project => {
      const query = SpeciesModel.where({ project: project._id }).sort(
        form.sort,
      );
      return SpeciesModel.paginate(query, {
        offset: form.index * form.size,
        limit: form.size,
      });
    })
    .then(result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});

exports.addProjectSpecies = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects/:projectId/species
   */
  const form = new SpeciesForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return ProjectModel.findById(req.params.projectId)
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

      const species = new SpeciesModel({
        ...form,
        project,
      });
      return species.save();
    })
    .then(species => {
      res.json(species.dump());
    });
});

exports.updateProjectSpecies = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/species/:speciesId
   */
  const form = new SpeciesForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    SpeciesModel.findById(req.params.speciesId),
  ])
    .then(([project, species]) => {
      if (
        !project ||
        !species ||
        `${species.project._id}` !== `${project._id}`
      ) {
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
      species.title = form.title;
      species.index = form.index;
      return species.save();
    })
    .then(species => {
      res.json(species.dump());
    });
});

exports.deleteProjectSpecies = auth(UserPermission.all(), (req, res) =>
  /*
  DELETE /api/v1/projects/:projectId/species/:speciesId
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    SpeciesModel.findById(req.params.speciesId),
  ])
    .then(([project, species]) => {
      if (
        !project ||
        !species ||
        `${species.project._id}` !== `${project._id}`
      ) {
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
      return species.delete();
    })
    .then(() => {
      res.status(204).send();
    }),
);
