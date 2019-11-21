const moment = require('moment');
require('twix');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const ProjectTrip = require('../../models/data/project-trip-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
};

const getMonthRange = (startDate, endDate) => {
  const s = moment(startDate);
  const e = moment(endDate);

  const result = [];
  while (s.isBefore(e)) {
    result.push(s.format('YYYY-MM'));
    s.add(1, 'month');
  }
  return result;
};

module.exports = async (req, res) => {
  const form = req.query;
  const { cameraLocationIds = [], startDateTime, endDateTime } = form;
  const cameraLocations = await fetchCameraLocations(cameraLocationIds);

  const trips = await ProjectTrip.find({
    'studyAreas.cameraLocations.cameraLocation': {
      $in: cameraLocationIds,
    },
  });

  const times = {};
  const totalTime = {};
  trips.forEach(t => {
    t.studyAreas.forEach(s => {
      s.cameraLocations.forEach(
        ({ _id: cameraLocationId, title, projectCameras }) => {
          projectCameras.forEach(({ startActiveDate, endActiveDate }) => {
            if (typeof times[title] === 'undefined') {
              times[title] = [];
            }

            if (typeof totalTime[title] === 'undefined') {
              totalTime[title] = 0;
            }
            const durations = moment(endActiveDate).diff(startActiveDate);
            totalTime[title] += durations;
            times[title].push({
              cameraLocationId,
              startTime: startActiveDate,
              endTime: endActiveDate,
            });
          });
        },
      );
    });
  });

  let data = [];

  if (form.range === 'month') {
    const monthList = getMonthRange(startDateTime, endDateTime);
    cameraLocations.forEach(c => {
      const workingCameraRange = times[c.name];
      monthList.forEach(m => {
        const begin = moment(m).startOf('month');
        const end = moment(m).endOf('month');

        let total = 0;

        workingCameraRange.forEach(({ startTime, endTime }) => {
          const range1 = moment(startTime).twix(endTime);
          const range2 = moment(begin).twix(end);

          const rr = range1.intersection(range2);
          const duration = rr._end.diff(rr._start);
          total += moment
            .duration(duration < 0 ? 0 : rr._end.diff(rr._start))
            .asHours();
        });

        data.push({
          cameraLocationId: c._id,
          title: c.name,
          workHours: total,
          month: moment(m).format('M'),
          year: moment(m).format('Y'),
        });
      });
    });
  } else {
    data = Object.keys(totalTime).map((v, i) => {
      const { cameraLocationId } = times[v];
      return {
        cameraLocationId,
        title: v,
        workHours: moment.duration(totalTime[v]).asHours(),
      };
    });
  }
  res.json(data);
};
