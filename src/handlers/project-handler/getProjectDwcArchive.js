const config = require('config');
const ProjectModel = require('../../models/data/project-model');
const ProjectTripModel = require('../../models/data/project-trip-model');
const errors = require('../../models/errors');
const utils = require('../../common/utils');

/**
  GET /api/v1/projects/:projectId/dwca
*/
module.exports = async (req, res) => {
  const { projectId } = req.params;
  const project = await ProjectModel.findById(projectId);
  const trip = await ProjectTripModel.findOne({ project: projectId });
  // console.log(trip);
  if (!project) {
    throw new errors.Http404();
  }

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403();
  }

  const folder = config.s3.folders.annotationDWCAs;

  let [meta, eml, occurrence, event] = [];
  try {
    if (trip) {
      [meta, eml, occurrence, event] = await Promise.all([
        utils.getS3Object(`${folder}/${projectId}/meta.xml`),
        utils.getS3Object(`${folder}/${projectId}/eml.xml`),
        utils.getS3Object(`${folder}/${projectId}/occurrence.txt`),
        utils.getS3Object(`${folder}/${projectId}/event.txt`),
      ]);
    } else {
      [meta, eml, occurrence, event] = await Promise.all([
        utils.getS3Object(`${folder}/${projectId}/meta.xml`),
        utils.getS3Object(`${folder}/${projectId}/eml.xml`),
        utils.getS3Object(`${folder}/${projectId}/occurrence.txt`),
      ]);
    }
  } catch (e) {
    throw new errors.Http404();
  }

  const zipFiles = [
    {
      content: occurrence.Body.toString('utf-8'),
      name: 'occurrence.txt',
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
  ];
  if (trip) {
    zipFiles.push({
      content: event.Body.toString('utf-8'),
      name: 'event.txt',
      date: new Date(),
      type: 'file',
    });
  }
  res.zip({
    files: zipFiles,
    filename: `dwca-camera-trap-${encodeURIComponent(project.shortTitle)}.zip`,
  });
};
