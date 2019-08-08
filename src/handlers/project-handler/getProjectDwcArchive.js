const config = require('config');
const ProjectModel = require('../../models/data/project-model');
const errors = require('../../models/errors');
const utils = require('../../common/utils');

/**
  GET /api/v1/projects/:projectId/dwca
*/
module.exports = async (req, res) => {
  const { projectId } = req.params;
  const project = await ProjectModel.findById(projectId);

  if (!project) {
    throw new errors.Http404();
  }

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403();
  }

  const folder = config.s3.folders.annotationDWCAs;

  let [meta, eml, occurrence] = [];
  try {
    [meta, eml, occurrence] = await Promise.all([
      utils.getS3Object(`${folder}/${projectId}/meta.xml`),
      utils.getS3Object(`${folder}/${projectId}/eml.xml`),
      utils.getS3Object(`${folder}/${projectId}/occurrence.csv`),
    ]);
  } catch (e) {
    throw new errors.Http404();
  }

  res.zip({
    files: [
      {
        content: occurrence.Body.toString('utf-8'),
        name: 'occurrence.csv',
        date: new Date(),
        type: 'file',
      },
      {
        content: meta.Body.toString('utf-8'),
        name: 'meta.xml',
        date: new Date(),
        type: 'file',
      },
      {
        content: eml.Body.toString('utf-8'),
        name: 'eml.xml',
        date: new Date(),
        type: 'file',
      },
    ],
    filename: `dwca-camera-trap-${encodeURIComponent(project.shortTitle)}.zip`,
  });
};
