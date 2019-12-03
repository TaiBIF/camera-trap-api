const errors = require('../../models/errors');
const PageList = require('../../models/page-list');
const ProjectModel = require('../../models/data/project-model');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const CameraLocationsSearchForm = require('../../forms/camera-location/camera-locations-search-form');

/*
 * GET /api/v1/projects/:projectId/study-areas/:studyAreaIds/camera-locations
 */
module.exports = async (req, res) => {
  const form = new CameraLocationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) {
    throw new errors.Http404();
  }

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403();
  }

  const studyAreaIds = [req.params.studyAreaId];
  const studyAreas = await StudyAreaModel.where({
    state: StudyAreaState.active,
    project: req.params.projectId,
    _id: { $in: studyAreaIds },
  });
  if (!studyAreas.length) {
    throw new errors.Http404();
  }

  const subStudyAreas = await StudyAreaModel.where({
    state: StudyAreaState.active,
  })
    .where({ parent: req.params.studyAreaId })
    .where({ project: req.params.projectId });

  const allStudyAreaIds = subStudyAreas.map(x => x._id);
  // allStudyAreaIds.push(studyArea._id);

  const query = CameraLocationModel.where({
    state: CameraLocationState.active,
    studyArea: { $in: allStudyAreaIds },
  }).populate('lockUser');

  const { totalDocs, docs } = await CameraLocationModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  });

  const cameraLocations = await CameraLocationModel.joinFailuresAndCanTrash(
    docs,
  );

  res.json(new PageList(form.index, form.size, totalDocs, cameraLocations));
};
