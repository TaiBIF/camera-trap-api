const _ = require('lodash');
const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');

// speciesTimeSeriesByCameraLocationId
module.exports = async function(
  projectId,
  studyAreaId,
  // cameraLocationId,
  year,
) {
  if (!year) {
    throw new errors.Http400();
  }
  const AnnotationModel = this.db.model('AnnotationModel');
  // const StudyAreaModel = this.db.model('StudyAreaModel');

  // const studyArea = await StudyAreaModel.getByProjectId(projectId);
  // const studyAreaIds = _.map(studyArea, '_id');

  const timeYearStart = new Date(year, 0, 1, 0);
  const timeYearEnd = new Date(timeYearStart.getFullYear() + 1, 0, 1);

  let top5 = await AnnotationModel.aggregate([
    {
      // TODO 物種只計算計畫中預設物種清單，去除諸如「空拍」、「測試」、「人」、「定時測試」、「工作照」等
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        studyArea: mongoose.Types.ObjectId(studyAreaId),
        time: { $gt: timeYearStart, $lt: timeYearEnd },
      },
    },
    {
      $group: {
        _id: '$species',
        count: { $sum: 1 },
      },
    },
  ]);

  top5 = top5.sort((a, b) => {
    if (a.count < b.count) return 1;
    if (a.count > b.count) return -1;
    return 0;
  });
  const top5Ids = _.map(_.take(top5, 5), '_id');

  //
  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        studyArea: mongoose.Types.ObjectId(studyAreaId),
        species: { $in: top5Ids },
        time: { $gt: timeYearStart, $lt: timeYearEnd },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$time' },
          year: { $year: '$time' },
          species: '$species',
          studyArea: '$studyArea',
        },
        numberOfRecords: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'Species',
        localField: '_id.species',
        foreignField: '_id',
        as: 'speciesData',
      },
    },
    {
      $lookup: {
        from: 'Species',
        localField: '_id.species',
        foreignField: '_id',
        as: 'speciesData',
      },
    },
    {
      $lookup: {
        from: 'StudyAreas',
        localField: '_id.studyArea',
        foreignField: '_id',
        as: 'studyArea',
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        year: '$_id.year',
        species: { $arrayElemAt: ['$speciesData.title.zh-TW', 0] },
        speciesId: '$_id.species',
        numberOfRecords: '$numberOfRecords',
        studyArea: { $arrayElemAt: ['$studyArea.title.zh-TW', 0] },
        studyAreaId: '$_id.studyArea',
      },
    },
  ]);

  return reformatSpeciesTimeSeries(r);
};
