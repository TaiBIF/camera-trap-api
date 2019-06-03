const mongoose = require('mongoose');
const config = require('config');
const debug = require('debug')('app:model:project:speciesTimeSeries');
const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');
const errors = require('../../errors');

module.exports = async function(projectId, keyName, keyId) {
  const AnnotationModel = this.db.model('AnnotationModel');
  const ProjectModel = this.db.model('ProjectModel');

  const top5Ids = await ProjectModel.topSpecies(projectId, 5);
  const timeOffset = new Date(0);
  timeOffset.setUTCMinutes(timeOffset.getUTCMinutes() - config.defaultTimezone);

  debug('top5Ids %j', top5Ids);
  debug('timeOffset %d', timeOffset);
  debug('keyName: %s, keyId: %s', keyName, keyId);

  let subKeyName = '';

  switch (keyName) {
    case 'project':
      subKeyName = 'studyArea';
      break;
    case 'studyArea':
      subKeyName = 'cameraLocation';
      break;
    default:
      throw new errors.Http400('bad keyName.');
  }

  //
  const r = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        species: { $in: top5Ids },
        [keyName]: mongoose.Types.ObjectId(keyId),
      },
    },
    {
      $group: {
        _id: {
          month: { $month: { $subtract: ['$time', timeOffset.getTime()] } },
          year: { $year: { $subtract: ['$time', timeOffset.getTime()] } },
          species: '$species',
          [subKeyName]: `$${[subKeyName]}`,
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
        projectId: '$_id.project',
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

  return reformatSpeciesTimeSeries(r, keyName);
};
