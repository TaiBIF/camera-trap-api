const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectAreaModel = require('../models/data/project-area-model');
const ProjectAreasSearchForm = require('../forms/project-area/project-areas-search-form');

exports.getProjectAreas = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/project-areas
   */
  const form = new ProjectAreasSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectAreaModel.find().sort(form.sort);
  return ProjectAreaModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});
