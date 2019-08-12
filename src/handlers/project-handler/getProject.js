const config = require('config');
const ProjectModel = require('../../models/data/project-model');
const errors = require('../../models/errors');
const utils = require('../../common/utils');

/*
  GET /api/v1/projects/:projectId
*/
module.exports = async (req, res) => {
  const project = await ProjectModel.findById(req.params.projectId)
    .populate('coverImageFile')
    .populate('areas')
    .populate('members.user')
    .populate('dataFields');

  if (!project) {
    throw new errors.Http404();
  }
  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403('The user is not a project member.');
  }

  let occurrence = {};
  try {
    const folder = config.s3.folders.annotationDWCAs;
    occurrence = await utils.getS3Object(
      `${folder}/${project._id}/occurrence.txt`,
    );
  } catch (e) {
    // file not exist
  }

  res.json({ ...project.dump(), dwc: occurrence.LastModified });
};
