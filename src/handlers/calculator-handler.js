const config = require('config');
const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const LTDForm = require('../forms/calculator/ltd-form');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const SpeciesModel = require('../models/data/species-model');
const ProjectModel = require('../models/data/project-model');
const ProjectSpeciesModel = require('../models/data/project-species-model');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');

exports.calculateLTD = auth(UserPermission.all(), (req, res) => {
  /*
  GET /calculator/ltd
  Latency to initial detection
  @response {Array<Object>}
    {
      "time": "2016-05-05T16:00:00.000Z",
      "duration": null // 沒有照片
    },
    {
      "time": "2016-05-06T16:00:00.000Z",
      "duration": 71520000 // 71520000ms -> 19hrs and 52 minutes
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
      ]);
    })
    .then(([cameraLocation, species, project, projectSpecies]) => {
      if (!project) {
        throw new errors.Http400('The project is not exists.');
      }
      if (!projectSpecies) {
        throw new errors.Http400('The species is not belong to the project.');
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      const matchCondition = {
        state: AnnotationState.active,
        cameraLocation: cameraLocation._id,
        species: species._id,
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
    })
    .then(items => {
      const result = [];
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
        result.push({
          time: new Date(time),
          duration: item ? item.annotation.time - item._id : null,
        });
      }

      res.json(result);
    });
});
