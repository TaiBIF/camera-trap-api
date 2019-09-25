const Promise = require('bluebird');
const utils = require('../../common/utils');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const ProjectSpeciesModel = require('../../models/data/project-species-model');
const SpeciesModel = require('../../models/data/species-model');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const AnnotationState = require('../../models/const/annotation-state');
const logger = require('../../logger');

module.exports = async (
  csvContentArray,
  files,
  project,
  user,
  uploadSession,
) => {
  const projectId = project._id;
  const allCameraLocations = await CameraLocationModel.where({
    project: projectId,
  })
    .where({ state: CameraLocationState.active })
    .find();

  const allProjectSpecies = await ProjectSpeciesModel.where({
    project: projectId,
  });

  const allSpecies = await SpeciesModel.where();
  const allStudyAreas = await StudyAreaModel.where({
    project: projectId,
  })
    .where({ state: StudyAreaState.active })
    .find();

  const { annotations } = utils.convertCsvToAnnotations({
    project,
    studyAreas: allStudyAreas,
    dataFields: project.dataFields,
    cameraLocations: allCameraLocations,
    uploadSession,
    projectSpecies: allProjectSpecies,
    species: allSpecies,
    csvObject: csvContentArray,
  });

  logger.info(
    `zip worker job processing. save ${
      annotations.length
    } annotations, projectId: ${project._id}`,
  );

  await Promise.resolve(annotations).map(
    annotation => {
      annotation.state = AnnotationState.active;
      annotation.file = files[annotation.filename];
      return annotation.saveAndAddRevision(user);
    },
    { concurrency: 20 },
  );
};
