const _ = require('lodash');
const bluebird = require('bluebird');
const AnnotationModel = require('../models/data/annotation-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const SpeciesModel = require('../models/data/species-model');
const FileModel = require('../models/data/file-model');
const CameraLocationsModel = require('../models/data/camera-location-model');
const ProjectTripsModel = require('../models/data/project-trip-model');

exports.getStatistics = async (req, res) => {
  /*
    GET /api/v1/statistics
  */
  const oldestCameraLocation = await CameraLocationModel.find({
    settingTime: { $ne: '' },
  })
    .sort('settingTime')
    .limit(1);
  const oldestPicture = await AnnotationModel.find({
    time: { $ne: '', $gt: new Date('2008') },
  })
    .sort('time')
    .limit(1);

  const startYear = Math.min(
    oldestCameraLocation[0].settingTime.getFullYear(),
    oldestPicture[0].time.getFullYear(),
  );
  const endYear = new Date().getFullYear();

  // eslint-disable-next-line prefer-const
  let totalCameraLocation = 0;
  let totalPictureCount = 0;
  const yearArr = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const startDate = new Date(`${year}-01-01 00:00:00`).toLocaleString(
      'zh-TW',
      { timeZone: 'Asia/Taipei' },
    );
    const endDate = new Date(`${year}-12-31 23:59:59`).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
    });

    // eslint-disable-next-line no-await-in-loop
    const pictureCount = await AnnotationModel.find({
      time: { $gt: new Date(startDate), $lte: new Date(endDate) },
    }).count();

    totalPictureCount += pictureCount;

    // eslint-disable-next-line no-await-in-loop
    const cameraLocations = await CameraLocationModel.find({
      settingTime: { $gt: new Date(startDate), $lte: new Date(endDate) },
    }).exec();

    totalCameraLocation += cameraLocations.length;

    yearArr.push({
      year,
      totalPicture: totalPictureCount,
      totalCameraLocation,
    });
  }

  // species
  const speciesData = await SpeciesModel.where('isAcceptedName')
    .equals(true)
    .sort('sort');
  const speciesArr = await bluebird.map(
    speciesData,
    async species => {
      species = species.dump();

      const totalPicture = await AnnotationModel.distinct('filename', {
        species: species.id,
      }).exec();
      const totalLocation = await AnnotationModel.distinct('cameraLocation', {
        species: species.id,
      }).exec();

      console.log(
        'totalPicture %d, totalLocation %d',
        totalPicture.length,
        totalLocation.length,
      );
      const TT = 'just a test';

      return {
        TT,
        species: species.id,
        name: species.title['zh-TW'],
        totalPicture: totalPicture.length,
        totalLocation: totalLocation.length,
      };
    },
    { concurrency: 20 },
  );

  const funderArr = await FileModel.aggregate([
    {
      $group: {
        _id: '$project',
        size: { $sum: '$size' },
      },
    },
    {
      $match: { _id: { $ne: null } },
    },
    {
      $lookup: {
        from: 'Projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: '$project' },
    {
      $group: {
        _id: '$project.funder',
        size: { $sum: '$size' },
      },
    },
    {
      $project: {
        name: '$_id',
        totalData: '$size',
      },
    },
  ]);

  res.json({ year: yearArr, species: speciesArr, funder: funderArr });
};

exports.getStatisticsByCounty = async (req, res) => {
  /*
    GET /api/v1/statistics/county/{countyName}
  */
  const { countyName } = req.params;

  const studyAreaIds = await CameraLocationsModel.distinct('studyArea', {
    city: countyName,
  });
  const projects = await CameraLocationsModel.distinct('project', {
    city: countyName,
  });

  const cameraLocations = await CameraLocationsModel.distinct('name', {
    studyArea: { $in: studyAreaIds },
  });

  // identifiedSpecies
  const cameraLocationIds = await CameraLocationsModel.distinct('_id', {
    studyArea: { $in: studyAreaIds },
  });
  const allAnnotationCount = await AnnotationModel.find({
    cameraLocation: { $in: cameraLocationIds },
  }).count();
  const identifiedAnnotationCount = await AnnotationModel.find({
    species: { $exists: true },
    cameraLocation: { $in: cameraLocationIds },
  }).count();

  const identifiedSpeciesIds = await AnnotationModel.distinct('species', {
    species: { $exists: true },
    cameraLocation: { $in: cameraLocationIds },
  });

  let identifiedSpecies = await SpeciesModel.find(
    { _id: { $in: identifiedSpeciesIds } },
    { title: 1 },
  );

  identifiedSpecies = identifiedSpecies.map(species => ({
    name: species.title,
    species: species._id,
  }));

  // picture
  const pictureTotal = await AnnotationModel.distinct('filename', {
    cameraLocation: { $in: cameraLocationIds },
  });

  // TotalWorkHour
  const totalWorkHour = await ProjectTripsModel.aggregate([
    {
      $match: {
        'studyAreas.studyArea': { $in: studyAreaIds },
      },
    },
    { $unwind: '$studyAreas' },
    {
      $match: {
        'studyAreas.studyArea': { $in: studyAreaIds },
      },
    },
    { $unwind: '$studyAreas.cameraLocations' },
    { $unwind: '$studyAreas.cameraLocations.projectCameras' },
    {
      $project: {
        dateDifference: {
          $subtract: [
            '$studyAreas.cameraLocations.projectCameras.endActiveDate',
            '$studyAreas.cameraLocations.projectCameras.startActiveDate',
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        duringTime: { $sum: { $divide: ['$dateDifference', 1000] } },
      },
    },
    {
      $project: {
        totalWorkHour: { $divide: ['$duringTime', 3600] },
      },
    },
  ]);

  // studyArea
  const studyAreaItems = await CameraLocationModel.aggregate([
    {
      $match: { studyArea: { $in: studyAreaIds } },
    },
    {
      $lookup: {
        as: 'data',
        from: 'Annotations',
        let: {
          cameraLocation: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$cameraLocation', '$$cameraLocation'],
              },
            },
          },
          { $count: 'total' },
        ],
      },
    },
    { $unwind: '$data' },
    {
      $project: {
        studyArea: '$studyArea',
        cameraLocation: '$_id',
        name: '$name',
        settingTime: '$settingTime',
        latitude: '$latitude',
        longitude: '$longitude',
        altitude: '$altitude',
        landCoverType: '$landCoverType',
        vegetation: '$vegetation',
        data: '$data',
      },
    },
    {
      $group: {
        _id: '$studyArea',
        total: { $sum: 1 },
        items: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        studyArea: '$studyArea',
        cameraLocation: {
          total: '$total',
          items: '$items',
        },
      },
    },
    {
      $lookup: {
        as: 'data',
        from: 'Annotations',
        let: {
          studyArea: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$studyArea', '$$studyArea'],
              },
            },
          },
          { $count: 'total' },
        ],
      },
    },
    { $unwind: '$data' },
    {
      $lookup: {
        from: 'StudyAreas',
        localField: '_id',
        foreignField: '_id',
        as: 'studyAreasData',
      },
    },
    { $unwind: '$studyAreasData' },
    {
      $project: {
        studyArea: '$_id',
        title: '$studyAreasData.title',
        cameraLocation: '$cameraLocation',
        data: '$data',
      },
    },
  ]);

  res.json({
    title: { 'zh-TW': req.params.countyName },
    project: { total: projects.length },
    cameraLocation: { total: cameraLocations.length },
    identifiedSpecies: {
      percentage: (identifiedAnnotationCount / allAnnotationCount) * 100 || 0,
      items: identifiedSpecies,
    },
    picture: { total: pictureTotal.length },
    camera: { totalWorkHour: _.get(totalWorkHour, '0.totalWorkHour') || 0 },
    studyArea: {
      items: studyAreaItems,
    },
  });
};
