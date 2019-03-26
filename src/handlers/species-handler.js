const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const SpeciesModel = require('../models/data/species-model');
const SpeciesSearchForm = require('../forms/species/species-search-form');

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
      res.json(new PageList(form.index, form.size, result.total, result.docs));
    });
});
