const moment = require('moment');
const mongoose = require('mongoose');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const ProjectTrip = require('../../models/data/project-trip-model');
const SpeciesModel = require('../../models/data/species-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
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

const getDateRange = (startDate, endDate) => {
  const s = moment(startDate);
  const e = moment(endDate);

  const result = [];
  while (s.isBefore(e)) {
    result.push(s.format('YYYY-MM-DD'));
    s.add(1, 'day');
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
  // const calculateTimeIntervel = parseInt(form.calculateTimeIntervel || 0, 10);
  const species = await SpeciesModel.find({
    _id: { $in: speciesIds },
  });

  const cameraLocations = await fetchCameraLocations(cameraLocationIds);
  const annotationQuery = getAnnotationQuery(form);
  const annotations = await annotationQuery;

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
  });

  const data = [];
  const dateList = getDateRange(startDateTime, endDateTime);

  species.forEach(({ _id: s }) => {
    cameraLocations.forEach(c => {
      // const workingCameraRange = times[c.name];
      dateList.forEach(d => {
        let isDetected = 0;
        if (range === 'hour') {
          const hours = Array(24).fill(0);
          let timeFormat = '';
          annotations
            .filter(({ cameraLocation }) => `${cameraLocation}` === `${c._id}`)
            .filter(({ time }) => moment(time).format('YYYY-MM-DD') === d)
            .filter(
              ({ species: { _id: annotationSpeicesId } }) =>
                `${annotationSpeicesId}` === `${s}`,
            )
            .forEach(({ time }) => {
              timeFormat = moment(time).format('YYYY-MM-DD HH:mm:ss');
              isDetected = 1;
              // console.log(time, moment(time).format('H'), moment(time).format('YYYY-MM-DD HH:mm:ss'));
              for (let h = 0; h < 24; h += 1) {
                if (moment(time).format('H') === h.toString()) {
                  hours[h] = 1;
                }
              }
            });
          data.push({
            species: s,
            cameraLocationId: c._id,
            title: c.name,
            hours,
            time: timeFormat,
            detection: isDetected,
            date: moment(d).format('YYYY-MM-DD'),
          });
        } else if (range === 'day') {
          annotations
            .filter(({ cameraLocation }) => `${cameraLocation}` === `${c._id}`)
            .filter(({ time }) => moment(time).format('YYYY-MM-DD') === d)
            .filter(
              ({ species: { _id: annotationSpeicesId } }) =>
                `${annotationSpeicesId}` === `${s}`,
            )
            .forEach(({ time }) => {
              isDetected = 1;
            });
          data.push({
            species: s,
            cameraLocationId: c._id,
            title: c.name,
            detection: isDetected,
            date: moment(d).format('YYYY-MM-DD'),
          });
        }
      });
    });
  });
  res.json({
    species,
    data,
  });
};
