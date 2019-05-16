const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatRetrieved = require('./_reformatRetrieved');

// getRetrievedByStudyArea
module.exports = async function(projectId, studyAreaId, year) {
  if (!year) {
    throw new errors.Http400();
  }
  const AnnotationModel = this.db.model('AnnotationModel');

  const timeYearStart = new Date(year, 0, 1, 0);
  const timeYearEnd = new Date(timeYearStart.getFullYear() + 1, 0, 1);

  const r = await AnnotationModel.aggregate([
    {
      $match: {
        // project: mongoose.Types.ObjectId(projectId),
        studyArea: mongoose.Types.ObjectId(studyAreaId),
        time: { $gt: timeYearStart, $lt: timeYearEnd },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$time' },
          year: { $year: '$time' },
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
