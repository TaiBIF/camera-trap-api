const config = require('config');
const ProjectModel = require('../../models/data/project-model');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const errors = require('../../models/errors');
const utils = require('../../common/utils');

/*
const fetchAnnotationDateTimeRange = async () => {
  const dateTimeRange = AnnotationModel.where({
    project: project._id,
    state: AnnotationState.active,
  }).sort('time').limit(1).findOne(),
            AnnotationModel.where({
              project: project._id,
              state: AnnotationState.active,
            })
              .sort('-time')
              .limit(1)
              .findOne(),
          ]),
}
  */
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

  const dateTimeRange = await Promise.all([
    AnnotationModel.where({
      project: project._id,
      state: AnnotationState.active,
    })
      .sort('time')
      .limit(1)
      .findOne(),
    AnnotationModel.where({
      project: project._id,
      state: AnnotationState.active,
    })
      .sort('-time')
      .limit(1)
      .findOne(),
  ]).then(([d1, d2]) => [d1.time, d2.time]);

  res.json({
    ...project.dump(),
    dwc: occurrence.LastModified,
    annotationDateTimeRange: dateTimeRange,
  });
};
