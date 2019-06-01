const config = require('config');
const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatRetrieved = require('./_reformatRetrieved');
const AnnotationState = require('../../const/annotation-state');

// getRetrievedByCamera
module.exports = async function(projectId, cameraLocationId, year) {
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
        cameraLocation: mongoose.Types.ObjectId(cameraLocationId),
        time: { $gte: timeYearStart, $lt: timeYearEnd },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: { $subtract: ['$time', timeOffset.getTime()] } },
          cameraLocation: '$cameraLocation',
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

  return reformatRetrieved(r, 'cameraLocation');
};
