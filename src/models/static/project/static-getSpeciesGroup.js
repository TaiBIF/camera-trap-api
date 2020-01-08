const mongoose = require('mongoose');
const ProjectTripModel = require('../../../models/data/project-trip-model');

// getSpeciesGroup
module.exports = async function(projectId, tripId) {
  const AnnotationModel = this.db.model('AnnotationModel');

  let projectTrips = [];

  let match = {
    project: mongoose.Types.ObjectId(projectId),
  };

  if (tripId) {
    // gen trip filter data
    const projectTripDatas = await ProjectTripModel.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(tripId) } },
      { $unwind: '$studyAreas' },
      { $unwind: '$studyAreas.cameraLocations' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras.endActiveDate' },
      {
        $project: {
          cameraLocation: '$studyAreas.cameraLocations.cameraLocation',
          endActiveDate:
            '$studyAreas.cameraLocations.projectCameras.endActiveDate',
          startActiveDate:
            '$studyAreas.cameraLocations.projectCameras.startActiveDate',
        },
      },
      {
        $group: {
          _id: '$cameraLocation',
          startActiveDates: { $push: '$startActiveDate' },
          endActiveDates: { $push: '$endActiveDate' },
        },
      },
    ]);
    const projectTripsCameraLocation = [];
    projectTripDatas.forEach(projectTripData => {
      const startActiveDates = projectTripData.startActiveDates.map(
        startActiveDate => startActiveDate,
      );
      const endActiveDates = projectTripData.endActiveDates.map(
        endActiveDate => endActiveDate,
      );

      const prjectTripTemp = [];
      for (let i = 0; i < endActiveDates.length; i += 1) {
        prjectTripTemp.push({
          time: { $gte: startActiveDates[i], $lte: endActiveDates[i] },
          cameraLocation: projectTripData._id,
        });
        projectTripsCameraLocation.push(String(projectTripData._id));
      }

      projectTrips = projectTrips.concat(prjectTripTemp);
    });
  }

  if (tripId) {
    if (projectTrips.length) {
      match = { ...match, $or: projectTrips };
    } else {
      return [];
    }
  }

  return AnnotationModel.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: '$species',
        count: { $sum: 1 },
      },
    },

    {
      $lookup: {
        from: 'Species',
        localField: '_id',
        foreignField: '_id',
        as: 'Species',
      },
    },

    {
      $project: {
        _id: '$_id',
        species: { $arrayElemAt: ['$Species.title.zh-TW', 0] },
        count: '$count',
      },
    },
  ]);
};
