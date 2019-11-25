const errors = require('../../models/errors');
const PageList = require('../../models/page-list');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const CameraLocationsSearchForm = require('../../forms/camera-location/camera-locations-search-form');

/*
 * GET /api/v1/camera-locations
 */
module.exports = async (req, res) => {
  const form = new CameraLocationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const { studyAreaIds = [], projectId } = req.query;

  const studyAreasQuery = StudyAreaModel.where({
    state: StudyAreaState.active,
  });

  if (projectId) {
    studyAreasQuery.where({ project: projectId });
  }

  if (studyAreaIds.length) {
    studyAreasQuery.where({
      $or: [{ _id: { $in: studyAreaIds } }, { parent: { $in: studyAreaIds } }],
    });
  }

  const studyAreas = await studyAreasQuery.select({ _id: 1 });
  const allStudyAreaIds = studyAreas.map(x => x._id);
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
