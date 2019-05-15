const _ = require('lodash');
const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatRetrieved = require('./_reformatRetrieved');

// getRetrievedByProjectStudyArea
module.exports = async function(projectId, year) {
  if (!year) {
    throw new errors.Http400();
  }
  const AnnotationModel = this.db.model('AnnotationModel');
  const StudyAreaModel = this.db.model('StudyAreaModel');

  const studyArea = await StudyAreaModel.getByProjectId(projectId);
  const studyAreaIds = _.map(studyArea, '_id');

  const timeYearStart = new Date(year, 0, 1, 0);
  const timeYearEnd = new Date(timeYearStart.getFullYear() + 1, 0, 1);

  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        studyArea: { $in: studyAreaIds },
        time: { $gt: timeYearStart, $lt: timeYearEnd },
      },
    },
    {
      $lookup: {
        from: 'StudyAreas',
        localField: 'studyArea',
        foreignField: '_id',
        as: 'studyArea',
      },
    },
    {
      $addFields: {
        studyArea: { $arrayElemAt: ['$studyArea', 0] },
      },
    },
    {
      $addFields: {
        studyAreaId: {
          $cond: [
            { $not: ['$studyArea.parent'] },
            '$studyArea._id',
            '$studyArea.parent',
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$time' },
          studyArea: '$studyAreaId',
        },
        dataCount: { $sum: 1 },
        fileCount: {
          $sum: { $cond: [{ $eq: ['$file', undefined] }, 0, 1] },
        },
        speciesCount: {
          $sum: { $cond: [{ $eq: ['$species', undefined] }, 0, 1] },
        },
        failures: {
          $sum: { $cond: [{ $gte: [{ $size: '$failures' }, 1] }, 1, 0] },
        },
        lastData: { $max: '$createTime' },
      },
    },
  ]);

  return reformatRetrieved(r, 'studyArea');
};
