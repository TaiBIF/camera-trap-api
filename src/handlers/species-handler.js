const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
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

  const query = SpeciesModel.where({ project: req.params.projectId }).sort(
    form.sort,
  );
  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    SpeciesModel.paginate(query, {
      offset: form.index * form.size,
      limit: form.size,
    }),
  ]).then(([project, speciesList]) => {
    if (!project) {
      throw new errors.Http404();
    }
    if (
      req.user.permission !== UserPermission.administrator &&
      !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
    ) {
      throw new errors.Http403();
    }

    res.json(
      new PageList(
        form.index,
        form.size,
        speciesList.totalDocs,
        speciesList.docs,
      ),
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
    if (!form.id && !form.title) {
      throw new errors.Http400('Title is required');
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
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }

      const tasks = [];
      speciesList.forEach(species => {
        if (!forms.find(x => x.id === `${species._id}`)) {
          // Missing the species in forms.
          throw new errors.Http400(`Missing ${species._id}.`);
        }
      });
      forms.forEach((form, index) => {
        if (form.id) {
          // Update the exists species.
          const species = speciesList.find(x => `${x._id}` === form.id);
          if (!species) {
            throw new errors.Http400(`Can't find species ${form.id}.`);
          }
          species.index = index;
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
      if (!project.canManageBy(req.user)) {
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
    SpeciesModel.findById(req.params.speciesId).where({
      project: req.params.projectId,
    }),
  ])
    .then(([project, species]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!species) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }

      species.index = form.index;
      return species.save();
    })
    .then(species => {
      res.json(species.dump());
    });
});
