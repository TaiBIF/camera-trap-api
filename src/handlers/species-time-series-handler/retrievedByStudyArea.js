const errors = require('../../models/errors');
const ProjectModel = require('../../models/data/project-model');

/**
 * GET /api/v1/projects/:projectId/species-time-series
 */
module.exports = async (req, res) => {
  const { projectId } = req.params;

  const project = await ProjectModel.findById(projectId);

  if (!project) {
    throw new errors.Http404('Missing project ID.');
  }
  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403('Insufficient privilege.');
  }

  const records = await ProjectModel.speciesTimeSeries(
    projectId,
    'project',
    projectId,
  );

  res.json(records);
};
