const ProjectModel = require('../../models/data/project-model');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
// const PageList = require('../../models/page-list');
const errors = require('../../models/errors');
const helpers = require('../../common/helpers');
/**
  GET /api/v1/projects/:projectId/oversight
*/

const fetchYearStats = async (cameraLocationId, year) => {
  /* refer:
   *  https://stackoverflow.com/questions/52021756/mongodb-aggregate-with-nested-group
   */
  // const mx = month.toString().padStart(2, '0');
  const annotations = AnnotationModel.aggregate([
    {
      $addFields: {
        year: { $year: '$time' },
        md: { $dateToString: { format: '%m-%d', date: '$time' } },
        ym: { $dateToString: { format: '%Y-%m', date: '$time' } },
      },
    },
    {
      $match: {
        cameraLocation: cameraLocationId,
        state: AnnotationState.active,
        year,
      },
    },
    {
      $group: {
        _id: {
          // year: {$year: '$time'},
          // month: {$month: '$time'},
          // day: {$dayOfMonth: '$time'},
          ym: { $dateToString: { format: '%Y-%m', date: '$time' } },
          ymd: { $dateToString: { format: '%Y-%m-%d', date: '$time' } },
          // year: '$year'
        },
        data: { $push: '$$ROOT' },
        // data: { "$push": "$ },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { ym: '$_id.ym' },
        // data: {
        //  '$push': { k: '$_id.ymd', v: '$data' }
        // },
        count: { $sum: 1 },
      },
    },
  ]);
  return annotations;
};

module.exports = async (req, res) => {
  const findInYear = req.query.year
    ? parseInt(req.query.year, 10)
    : new Date().getFullYear();
  let studyAreaCameraLocations = [];
  const data = {};

  const project = await ProjectModel.findById(req.params.projectId).populate(
    'cameraLocations',
  );
  if (!project) {
    throw new errors.Http404();
  }

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403('The user is not a project member.');
  }

  const studyAreas = await StudyAreaModel.where({
    project: req.params.projectId,
    state: StudyAreaState.active,
    parent: { $exists: false },
  });
  // console.log(studyAreas);

  const subStudyAreas = await StudyAreaModel.where({
    project: req.params.projectId,
    state: StudyAreaState.active,
    parent: { $exists: true },
  });
  // console.log(subStudyAreas);

  const cameraLocations = await CameraLocationModel.where({
    project: req.params.projectId,
    state: CameraLocationState.active,
  });

  const daysInMonth = helpers.getDaysInMonth(findInYear);

  await Promise.all(
    cameraLocations.map(async c => {
      const yearStats = await fetchYearStats(c._id, findInYear);
      // console.log(c._id, yearStats);
      const row = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]; //  for 12 months
      // for (const x of yearStats) { // lint error
      yearStats.forEach(x => {
        const monthIndex = parseInt(x._id.ym.split('-')[1], 10) - 1;
        row[monthIndex] = [x.count, daysInMonth[monthIndex]];
      });
      data[c._id] = row;
    }),
  );

  studyAreaCameraLocations = studyAreas.map(sa => ({
    _id: sa.id,
    title: sa.title['zh-TW'],
    cameraLocations: cameraLocations
      .filter(c => c.studyArea.toString() === sa._id.toString())
      .map(x => ({
        _id: x._id,
        name: x.name,
      })),
    children: subStudyAreas
      .filter(ssa => ssa.parent.toString() === sa._id.toString())
      .map(x => ({
        _id: x.id,
        title: x.title['zh-TW'],
        cameraLocations: cameraLocations
          .filter(c => c.studyArea.toString() === x._id.toString())
          .map(y => ({
            _id: y._id,
            name: y.name,
          })),
      })),
  }));

  res.json({
    data,
    studyAreaCameraLocations,
    findInYear,
  });
};
