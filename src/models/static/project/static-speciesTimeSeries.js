const mongoose = require('mongoose');
const errors = require('../../errors');

module.exports = async function(projectId, keyName, keyId, year) {
  if (!year) {
    throw new errors.Http400('Missing parameter: year.');
  }
  const AnnotationModel = this.db.model('AnnotationModel');
  const ProjectModel = this.db.model('ProjectModel');

  const timeYearStart = new Date(year, 0, 1, 0);
  const timeYearEnd = new Date(timeYearStart.getFullYear() + 1, 0, 1);

  const top5Ids = await ProjectModel.topSpecies(projectId, 5);

  //
  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        species: { $in: top5Ids },
        time: { $gt: timeYearStart, $lt: timeYearEnd },
        [keyName]: mongoose.Types.ObjectId(keyId),
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$time' },
          year: { $year: '$time' },
          species: '$species',
          [keyName]: `$${[keyName]}`,
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
        from: 'CameraLocations',
        localField: '_id.cameraLocation',
        foreignField: '_id',
        as: 'cameraLocationData',
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
        cameraLocation: {
          $arrayElemAt: ['$cameraLocationData.geodeticDatum', 0],
        },
        cameraLocationId: '$_id.cameraLocation',
      },
    },
  ]);

  return r;
};
