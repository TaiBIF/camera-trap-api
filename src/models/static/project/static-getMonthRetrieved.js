const mongoose = require('mongoose');

module.exports = async function(projectId) {
  const AnnotationModel = this.db.model('AnnotationModel');

  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$time' },
          year: { $year: '$time' },
          studyArea: '$studyArea',
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

  return r;
};
