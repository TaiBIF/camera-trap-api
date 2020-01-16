const config = require('config');
const mongoose = require('mongoose');
const errors = require('../../errors');
const reformatRetrieved = require('./_reformatRetrieved');
const AnnotationState = require('../../const/annotation-state');
const ProjectTripModel = require('../../../models/data/project-trip-model');

// getRetrievedByCamera
module.exports = async function(
  projectId,
  cameraLocationId,
  year,
  tripId = null,
) {
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

  let r;
  let projectTrips = [];

  let match = {
    state: AnnotationState.active,
    cameraLocation: mongoose.Types.ObjectId(cameraLocationId),
    time: { $gte: timeYearStart, $lt: timeYearEnd },
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

  if (!tripId || projectTrips.length) {
    if (projectTrips.length) {
      match = { ...match, $or: projectTrips };
    }

    r = await AnnotationModel.aggregate([
      {
        $match: match,
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
  }

  return reformatRetrieved(r, 'cameraLocation');
};
