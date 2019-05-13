const _ = require('lodash');
const mongoose = require('mongoose');

// getRetrievedByProjectStudyArea
module.exports = async function(projectId) {
  const AnnotationModel = this.db.model('AnnotationModel');
  const StudyAreaModel = this.db.model('StudyAreaModel');

  const studyArea = await StudyAreaModel.getByProjectId(projectId);
  const studyAreaIds = _.map(studyArea, '_id');

  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        studyArea: { $in: studyAreaIds },
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
          year: { $year: '$time' },
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

  return r;
};
