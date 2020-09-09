const moment = require('moment-timezone');
require('twix');
const _ = require('underscore');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const SpeciesModel = require('../../models/data/species-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
};

const enumerateDaysBetweenDates = function(startDate, endDate) {
  moment.tz.setDefault('Asia/Taipei');
  const dates = [];

  const currDate = moment(startDate);
  const lastDate = moment(endDate).endOf('day');
  dates.push(currDate.clone().format('YYYY-MM-DD'));

  while (currDate.add(1, 'days').diff(lastDate) < 0) {
    dates.push(currDate.clone().format('YYYY-MM-DD'));
  }
  return dates;
};

const getAnnotationQuery = form => {
  const query = AnnotationModel.where({ state: AnnotationState.active })
    .populate('species')
    .populate('studyArea')
    .populate('file')
    .sort('cameraLocation time filename');

  if (form.cameraLocationIds.length) {
    query.where({
      cameraLocation: { $in: form.cameraLocationIds },
    });
  }

  if (form.speciesIds.length) {
    query.where({
      species: {
        $in: form.speciesIds,
      },
    });
  }

  if (form.startDateTime) {
    query.where({ time: { $gte: form.startDateTime } });
  }

  if (form.endDateTime) {
    query.where({ time: { $lte: form.endDateTime } });
  }

  const otherDataFields = Object.keys(form);
  if (otherDataFields.length) {
    otherDataFields.forEach(dataFieldId => {
      if (!mongoose.Types.ObjectId.isValid(dataFieldId)) {
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(dataFieldId)) {
        return;
      }
      const dataFieldValue = form[dataFieldId];
      query.where({
        fields: {
          $elemMatch: {
            dataField: dataFieldId,
            'value.text': dataFieldValue,
          },
        },
      });
    });
  }

  return query;
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
  const {
    cameraLocationIds = [],
    startDateTime,
    endDateTime,
    range,
    speciesIds,
  } = form;
  const species = await SpeciesModel.find({
    _id: { $in: speciesIds },
  });

  const cameraLocations = await fetchCameraLocations(cameraLocationIds);
  const annotationQuery = getAnnotationQuery(form);
  const annotations = await annotationQuery;

  const userid = [];
  cameraLocationIds.forEach(stringId => {
    userid.push(new ObjectID(stringId));
  });

  const timesTT = await AnnotationModel.aggregate([
    {
      $match: { cameraLocation: { $in: userid } },
    },

    {
      $sort: {
        time: -1.0,
      },
    },
    {
      $group: {
        _id: '$cameraLocation',
        starttimes: {
          $first: {
            $arrayElemAt: ['$rawData', 4.0],
          },
        },
        endtimes: {
          $last: {
            $arrayElemAt: ['$rawData', 4.0],
          },
        },
      },
    },
  ]);
  // console.log(timesTT)
  const timesArray = [];
  const totalTest = {};
  await timesTT.forEach(t => {
    const Start = moment(t.starttimes).format('YYYY-MM-DDTHH:mm:ss');
    const End = moment(t.endtimes).format('YYYY-MM-DDTHH:mm:ss');

    if (moment(End).isAfter(Start)) {
      const durationsT = moment(End).diff(Start);
      totalTest[t._id] = durationsT;

      // console.log(totalTest)

      timesArray.push({
        id: t._id,
        start: Start,
        end: End,
      });
    } else {
      const durationsT = moment(Start).diff(End);
      totalTest[t._id] = durationsT;

      // console.log(totalTest)

      timesArray.push({
        id: t._id,
        start: End,
        end: Start,
      });
    }
  });

  const result = _.groupBy(timesArray, 'id');

  /* const times = {};
  const totalTime = {};
  trips.forEach(t => {
    t.studyAreas.forEach(s => {
      s.cameraLocations.forEach(
        ({ cameraLocation: cameraLocationId, title, projectCameras }) => {
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
  }); */

  const data = [];

  const monthList = getMonthRange(startDateTime, endDateTime);

  species.forEach(({ _id: s }) => {
    const cameraLocationWorkPerMonth = {};
    const eventDatesPerMonth = [];
    cameraLocations.forEach(c => {
      const workingCameraRange = result[c._id];
      const eventDatesPerMonthOfCamera = {};
      // 整理每個月事件數
      annotations
        .filter(({ cameraLocation }) => `${cameraLocation}` === `${c._id}`)
        .filter(
          ({ species: { _id: annotationSpeicesId } }) =>
            `${annotationSpeicesId}` === `${s}`,
        )
        .forEach(({ time, cameraLocation }) => {
          const d = moment(time).format('YYYY-MM-DD');
          eventDatesPerMonthOfCamera[d] = 1;
        });

      // 整理每個月工作天數
      workingCameraRange.forEach(({ start, end }) => {
        const datesList = enumerateDaysBetweenDates(start, end);
        // console.log(datesList, start, end);
        datesList.forEach(date => {
          const dateM = moment(date).format('YYYY-MM');
          if (typeof cameraLocationWorkPerMonth[dateM] === 'undefined') {
            cameraLocationWorkPerMonth[dateM] = 0;
          }
          cameraLocationWorkPerMonth[dateM] += 1;
        });
      });
      Object.keys(eventDatesPerMonthOfCamera).forEach(d => {
        const m = moment(d).format('YYYY-MM');
        if (typeof eventDatesPerMonth[m] === 'undefined') {
          eventDatesPerMonth[m] = 0;
        }
        eventDatesPerMonth[m] += 1;
      });
    });

    monthList.forEach(m => {
      data.push({
        species: s,
        captureRate: parseFloat(
          (eventDatesPerMonth[m] / cameraLocationWorkPerMonth[m]).toFixed(3),
        ),
        captureCount: eventDatesPerMonth[m],
        totalDay: cameraLocationWorkPerMonth[m],
        month: moment(m).format('M'),
        year: moment(m).format('Y'),
      });
    });
  });
  if (range === 'month') {
    res.json({
      species,
      data,
    });
    return;
  }

  const allTotolDay = {};
  const allCaptureCount = {};
  data.forEach(({ species: s, captureCount, totalDay }) => {
    if (typeof allTotolDay[s] === 'undefined') {
      allTotolDay[s] = 0;
    }

    if (typeof allCaptureCount[s] === 'undefined') {
      allCaptureCount[s] = 0;
    }
    allTotolDay[s] += totalDay;
    allCaptureCount[s] += captureCount;
  });

  res.json({
    species,
    data: species.map(({ _id }) => ({
      species: _id,
      totalDay: allTotolDay[_id],
      captureCount: allCaptureCount[_id],
      captureRate:
        parseFloat((allCaptureCount[_id] / allTotolDay[_id]).toFixed(3)) || 0,
    })),
  });
};
