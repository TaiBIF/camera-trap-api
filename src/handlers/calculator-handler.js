const config = require('config');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const LTDForm = require('../forms/calculator/ltd-form');
const OIForm = require('../forms/calculator/oi-form');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const SpeciesModel = require('../models/data/species-model');
const ProjectModel = require('../models/data/project-model');
const ProjectSpeciesModel = require('../models/data/project-species-model');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const Helpers = require('../common/helpers.js');
const calculateWorkHours = require('./calculator-handler/work-hours');
const calculateValidPics = require('./calculator-handler/valid-pics');
const calculateEvents = require('./calculator-handler/events');
const calculateOi1 = require('./calculator-handler/oi1');
const calculateOi2 = require('./calculator-handler/oi2');
const calculateOi3 = require('./calculator-handler/oi3');
const calculateCaptureRate = require('./calculator-handler/capture-rate');
const calculateDetection = require('./calculator-handler/detection');
const calculateAPOA = require('./calculator-handler/apoa');

exports.workHour = auth(UserPermission.all(), calculateWorkHours);
exports.validPics = auth(UserPermission.all(), calculateValidPics);
exports.events = auth(UserPermission.all(), calculateEvents);
exports.oi1 = auth(UserPermission.all(), calculateOi1);
exports.oi2 = auth(UserPermission.all(), calculateOi2);
exports.oi3 = auth(UserPermission.all(), calculateOi3);
exports.captureRate = auth(UserPermission.all(), calculateCaptureRate);
exports.detection = auth(UserPermission.all(), calculateDetection);
exports.apoa = auth(UserPermission.all(), calculateAPOA);

exports.calculateOI = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/calculator/oi
  Occurrence index
  @response {Object}
    {
      cameraLocationWorkDuration: 53737326000, // 相機工作時數 ms
      validQuantity: 18, // 有效照片
      eventQuantity: 18, // 目擊事件
    }
   */
  const form = new OIForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    CameraLocationModel.findById(form.cameraLocation).where({
      state: CameraLocationState.active,
    }),
    SpeciesModel.findById(form.species),
  ])
    .then(([cameraLocation, species]) => {
      if (!cameraLocation) {
        throw new errors.Http400('Not found the camera location.');
      }
      if (!species) {
        throw new errors.Http400('Not found the species.');
      }
      return Promise.all([
        cameraLocation,
        species,
        ProjectModel.findById(cameraLocation.project._id),
        ProjectSpeciesModel.where({
          project: cameraLocation.project._id,
          species: species._id,
        }),
        Helpers.findSynonymSpecies(form.species),
      ]);
    })
    .then(
      ([
        cameraLocation,
        species,
        project,
        projectSpecies,
        synonymSpeciesIds,
      ]) => {
        if (!project) {
          throw new errors.Http400('The project does not exist.');
        }
        if (!projectSpecies) {
          throw new errors.Http400(
            'The species does not belong to the project.',
          );
        }
        if (!project.canAccessBy(req.user)) {
          throw new errors.Http403();
        }

        const matchCondition = {
          state: AnnotationState.active,
          cameraLocation: cameraLocation._id,
          // species: species._id,
          species: { $in: synonymSpeciesIds },
        };
        if (form.startTime || form.endTime) {
          matchCondition.time = {};
          if (form.startTime) {
            matchCondition.time.$gte = form.startTime;
          }
          if (form.endTime) {
            matchCondition.time.$lte = form.endTime;
          }
        }
        const matchConditionWithoutSpecies = Object.assign({}, matchCondition);
        delete matchConditionWithoutSpecies.species;

        return Promise.all([
          AnnotationModel.where(matchConditionWithoutSpecies)
            .sort({ time: 1 })
            .findOne(),
          AnnotationModel.where(matchConditionWithoutSpecies)
            .sort({ time: -1 })
            .findOne(),
          AnnotationModel.where(matchCondition).sort({ time: 1 }),
        ]);
      },
    )
    .then(([firstAnnotation, lastAnnotation, annotations]) => {
      let lastValidAnnotation;
      let lastEventAnnotation;
      const result = {
        cameraLocationWorkDuration: 0,
        validQuantity: 0,
        eventQuantity: 0,
      };

      if (
        !firstAnnotation ||
        `${firstAnnotation._id}` === `${lastAnnotation._id}`
      ) {
        // There are no data.
        return res.json(result);
      }

      annotations.forEach(annotation => {
        if (
          !lastValidAnnotation ||
          annotation.time - lastValidAnnotation.time > form.validTimeInterval
        ) {
          lastValidAnnotation = annotation;
          result.validQuantity += 1;
        }
        if (
          !lastEventAnnotation ||
          annotation.time - lastEventAnnotation.time > form.eventTimeInterval
        ) {
          result.eventQuantity += 1;
        }
        lastEventAnnotation = annotation;
      });

      result.cameraLocationWorkDuration =
        lastAnnotation.time - firstAnnotation.time;
      res.json(result);
    });
});

exports.calculateLTD = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/calculator/ltd
  Latency to initial detection
  @response {Array<Object>}
    {
      "time": "2016-05-05T16:00:00.000Z",
      "duration": null // 沒有照片
    },
    {
      "time": "2016-05-06T16:00:00.000Z",
      "duration": 71520000 // 71520000ms -> 19 hours and 52 minutes
    }
   */
  const form = new LTDForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const aDayInMilliseconds = 24 * 60 * 60 * 1000; // 24hr * 60s * 60m * 1000ms
  const timeOffset = new Date(0);
  timeOffset.setMinutes(timeOffset.getMinutes() - config.defaultTimezone);

  return Promise.all([
    CameraLocationModel.findById(form.cameraLocation).where({
      state: CameraLocationState.active,
    }),
    SpeciesModel.findById(form.species),
  ])
    .then(([cameraLocation, species]) => {
      if (!cameraLocation) {
        throw new errors.Http400('Not found the camera location.');
      }
      if (!species) {
        throw new errors.Http400('Not found the species.');
      }

      return Promise.all([
        cameraLocation,
        species,
        ProjectModel.findById(cameraLocation.project._id),
        ProjectSpeciesModel.where({
          project: cameraLocation.project._id,
          species: species._id,
        }),
        Helpers.findSynonymSpecies(form.species),
      ]);
    })
    .then(
      ([
        cameraLocation,
        species,
        project,
        projectSpecies,
        synonymSpeciesIds,
      ]) => {
        if (!project) {
          throw new errors.Http400('The project does not exists.');
        }
        if (!projectSpecies) {
          throw new errors.Http400(
            'The species does not belong to the project.',
          );
        }
        if (!project.canAccessBy(req.user)) {
          throw new errors.Http403();
        }

        const matchCondition = {
          state: AnnotationState.active,
          cameraLocation: cameraLocation._id,
          // species: species._id,
          species: { $in: synonymSpeciesIds },
        };
        if (form.startTime || form.endTime) {
          matchCondition.time = {};
          if (form.startTime) {
            matchCondition.time.$gte = form.startTime;
          }
          if (form.endTime) {
            matchCondition.time.$lte = form.endTime;
          }
        }
        return AnnotationModel.aggregate([
          {
            $match: matchCondition,
          },
          {
            $sort: { time: 1 },
          },
          {
            // Group result by 24hours time interval.
            // The time base is config.defaultTimezone.
            $group: {
              _id: {
                $subtract: [
                  { $toLong: '$time' },
                  {
                    $mod: [
                      { $subtract: ['$time', timeOffset] },
                      aDayInMilliseconds,
                    ],
                  },
                ],
              },
              annotation: { $first: '$$ROOT' },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);
      },
    )
    .then(items => {
      const result = {
        byDate: [],
        byMonth: [],
      };
      const resultByMonth = {};
      let startTime;
      let endTime;

      if (form.startTime) {
        startTime = new Date(
          form.startTime - ((form.startTime - timeOffset) % aDayInMilliseconds),
        );
      }
      if (!startTime && items.length) {
        startTime = new Date(items[0]._id);
      }
      if (!startTime) {
        return res.json([]);
      }

      if (form.endTime) {
        endTime = new Date(
          form.endTime - ((form.endTime - timeOffset) % aDayInMilliseconds),
        );
      }
      if (!endTime && items.length) {
        endTime = new Date(items[items.length - 1]._id);
      }

      for (
        let time = startTime.getTime();
        time <= endTime.getTime();
        time += aDayInMilliseconds
      ) {
        const item = items.find(x => x._id === time);
        const itemDate = new Date(time);
        const itemDuration = item ? item.annotation.time - item._id : null;
        const month = `0${itemDate.getMonth() + 1}`.slice(-2);
        const yearMonth = `${itemDate.getFullYear()}-${month}`;

        if (itemDuration && resultByMonth[yearMonth] === undefined) {
          resultByMonth[yearMonth] = {
            duration: itemDuration,
            days: itemDate.getDate() - 1,
          };
        }

        result.byDate.push({
          time: itemDate,
          duration: itemDuration,
        });
      }

      Object.keys(resultByMonth).forEach(key => {
        result.byMonth.push({
          time: key,
          duration: resultByMonth[key].duration,
          days: resultByMonth[key].days,
        });
      });
      res.json(result);
    });
});
