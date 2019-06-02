const config = require('config');
const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatRetrieved = require('./_reformatRetrieved');
const AnnotationState = require('../../const/annotation-state');
const StudyAreaState = require('../../const/study-area-state');

// getRetrievedByProjectStudyArea
module.exports = async function(projectId, year) {
  if (!year) {
    throw new errors.Http400();
  }
  const AnnotationModel = this.db.model('AnnotationModel');

  const timeOffset = new Date(0);
  timeOffset.setUTCMinutes(timeOffset.getUTCMinutes() - config.defaultTimezone);

  const timeYearStart = new Date(Date.UTC(year, 0, 1));
  timeYearStart.setUTCMinutes(
    timeYearStart.getUTCMinutes() - config.defaultTimezone,
  );
  const timeYearEnd = new Date(timeYearStart);
  timeYearEnd.setUTCFullYear(timeYearEnd.getUTCFullYear() + 1);

  const r = await AnnotationModel.aggregate([
    {
      $match: {
        state: AnnotationState.active,
        project: mongoose.Types.ObjectId(projectId),
        time: { $gte: timeYearStart, $lt: timeYearEnd },
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
      $match: { 'studyArea.state': StudyAreaState.active },
    },
    {
      $group: {
        _id: {
          month: { $month: { $subtract: ['$time', timeOffset.getTime()] } },
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
