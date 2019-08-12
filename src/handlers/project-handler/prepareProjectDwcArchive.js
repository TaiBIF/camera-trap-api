const config = require('config');
const { keyBy } = require('lodash');
const moment = require('moment');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const NotificationModel = require('../../models/data/notification-model');
const NotificationType = require('../../models/const/notification-type');
const ProjectModel = require('../../models/data/project-model');
const SpeciesModel = require('../../models/data/species-model');
const errors = require('../../models/errors');
const Helpers = require('../../common/helpers.js');
const utils = require('../../common/utils');

/**
  GET /api/v1/projects/:projectId/prepare-dwca
*/
module.exports = async (req, res) => {
  const { projectId } = req.params;
  const project = await ProjectModel.findById(projectId);

  if (!project) {
    throw new errors.Http404();
  }

  if (!project.canAccessBy(req.user)) {
    throw new errors.Http403();
  }

  // titles
  const occurrenceData = [
    [
      'occurrenceID',
      'basisOfRecord',
      'eventTime',
      'country',
      'countryCode',
      'verbatimElevation',
      'decimalLatitude',
      'decimalLongitude',
      'geodeticDatum',
      'vernacularName',
    ],
  ];

  const speciesRawData = await SpeciesModel.find().select({
    'title.zh-TW': true,
    _id: true,
  });
  const species = keyBy(speciesRawData, '_id');

  const cameraLocationsRawData = await CameraLocationModel.where({
    project: projectId,
  }).select({
    altitude: true,
    latitude: true,
    longitude: true,
    geodeticDatum: true,
    _id: true,
  });

  const cameraLocations = keyBy(cameraLocationsRawData, '_id');
  const annotationsCursor = await AnnotationModel.where({
    state: AnnotationState.active,
    project: projectId,
  })
    .select(['_id', 'createTime', 'cameraLocation', 'species'])
    .cursor();

  annotationsCursor.on('data', annotation => {
    const id = annotation._id.toString();
    const cameraLocation = cameraLocations[annotation.cameraLocation] || {};

    occurrenceData.push([
      id,
      'MachineObservation',
      moment(annotation.createTime).format('YYYY-MM-DD HH:mm:ss'),
      'Taiwan',
      'TW',
      cameraLocation.altitude,
      cameraLocation.latitude,
      cameraLocation.longitude,
      cameraLocation.geodeticDatum,
      species[annotation.species]
        ? species[annotation.species].title['zh-TW']
        : '',
    ]);
  });

  annotationsCursor.on('end', () => {
    utils
      .csvStringifyAsync(occurrenceData)
      .then(archiveData => {
        const dwcFiles = Helpers.createDwCA(project, archiveData);
        const folder = config.s3.folders.annotationDWCAs;

        dwcFiles.forEach(f => {
          utils.uploadToS3({
            Key: `${folder}/${projectId}/${f.name}`,
            Body: f.content,
            StorageClass: 'STANDARD_IA',
          });
        });
      })
      .then(() => {
        // success finish action
        const notification = new NotificationModel({
          type: NotificationType.dwcFilesReady,
          user: req.user,
          message: {
            'zh-TW': `計畫「${
              project.title
            }」最新版本 Darwin Core Archive 已可下載。`,
          },
        });
        return notification.save();
      })
      .catch(e => {
        // error action
        const notification = new NotificationModel({
          type: NotificationType.dwcFilesReady,
          user: req.user,
          message: {
            'zh-TW': `計畫「${
              project.title
            }」最新版本 Darwin Core Archive 產出失敗。`,
          },
        });
        return notification.save();
      });
  });

  res.send();
};
