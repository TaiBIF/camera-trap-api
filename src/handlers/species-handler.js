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
        !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
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

exports.updateProjectSpeciesList = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/species
   */
  if (!Array.isArray(req.body)) {
    throw new errors.Http400();
  }
  const forms = [];
  for (let index = 0; index < req.body.length; index += 1) {
    const form = new SpeciesForm(req.body[index]);
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }
    forms.push(form);
  }

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    SpeciesModel.where({ project: req.params.projectId }).sort('index'),
  ])
    .then(([project, speciesList]) => {
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

      const formIds = [];
      forms.forEach(x => {
        if (x.id) {
          formIds.push(x.id);
        }
      });
      const tasks = [];
      speciesList.forEach(species => {
        if (formIds.indexOf(`${species._id}`) < 0) {
          // Delete this species. It was removed at forms.
          tasks.push(species.delete());
        }
      });
      forms.forEach((form, index) => {
        if (form.id) {
          // Update the exists species.
          const species = speciesList.find(x => `${x._id}` === form.id);
          if (!species) {
            throw new errors.Http400(`Can't find species ${form.id}.`);
          }
          Object.assign(species, { ...form, index });
          tasks.push(species.save());
        } else {
          // Create a new species.
          const species = new SpeciesModel({
            ...form,
            index,
            project,
          });
          tasks.push(species.save());
        }
      });
      return Promise.all(tasks);
    })
    .then(() => exports.getProjectSpecies(req, res));
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

      delete form.id;
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

      delete form.id;
      Object.assign(species, form);
      return species.save();
    })
    .then(species => {
      res.json(species.dump());
    });
});
