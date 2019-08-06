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
  const meta = await utils.getS3Object(`${folder}/${projectId}/meta.xml`);
  const eml = await utils.getS3Object(`${folder}/${projectId}/eml.xml`);
  const occurance = await utils.getS3Object(
    `${folder}/${projectId}/occurance.csv`,
  );

  res.zip({
    files: [
      {
        content: occurance.Body.toString('utf-8'),
        name: 'occurance.csv',
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
