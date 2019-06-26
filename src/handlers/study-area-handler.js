const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const StudyAreaForm = require('../forms/study-area/study-area-form');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');

exports.getProjectStudyAreas = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/projects/:projectId/study-areas
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    StudyAreaModel.where({ state: StudyAreaState.active })
      .where({ project: req.params.projectId })
      .sort('title.zh-TW'),
  ])
    .then(([project, studyAreas]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canAccessBy(req.user)) {
        throw new errors.Http403();
      }

      const studyAreaIds = studyAreas.map(x => x._id);
      return Promise.all([
        studyAreas,

        // Count quantity of failure annotations of study areas.
        AnnotationModel.aggregate([
          {
            $match: {
              studyArea: { $in: studyAreaIds },
              state: {
                $in: [AnnotationState.active, AnnotationState.waitForReview],
              },
              'failures.0': { $exists: true },
            },
          },
          {
            $group: {
              _id: '$studyArea',
              count: { $sum: 1 },
            },
          },
        ]),

        // Fetch a camera location of study areas for drawing the map.
        CameraLocationModel.aggregate([
          {
            $match: {
              studyArea: { $in: studyAreaIds },
              state: CameraLocationState.active,
            },
          },
          {
            $group: {
              _id: '$studyArea',
              cameraLocation: { $first: '$$ROOT' },
              count: { $sum: 1 },
            },
          },
        ]),

        // Fetch locked camera locations.
        CameraLocationModel.aggregate([
          {
            $match: {
              studyArea: { $in: studyAreaIds },
              state: CameraLocationState.active,
              lockExpiredTime: { $gt: new Date() },
            },
          },
          {
            $group: {
              _id: '$studyArea',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);
    })
    .then(
      ([
        studyAreas,
        failures,
        groupedCameraLocations,
        groupedLockedCameraLocations,
      ]) => {
        // Step 1. generate parents.
        const rootStudyAreas = [];
        studyAreas.forEach(studyArea => {
          if (!studyArea.parent) {
            const studyAreaInformation = studyArea.dump();
            const failure = failures.find(
              x => `${x._id}` === `${studyArea._id}`,
            );
            const groupedCameraLocation = groupedCameraLocations.find(
              x => `${x._id}` === `${studyArea._id}`,
            );
            const groupedLockedCameraLocation = groupedLockedCameraLocations.find(
              x => `${x._id}` === `${studyArea._id}`,
            );

            studyAreaInformation.children = [];
            studyAreaInformation.failures = failure ? failure.count : 0;
            studyAreaInformation.isLockedAllCameraLocation = !!(
              groupedLockedCameraLocation &&
              groupedLockedCameraLocation.count === groupedCameraLocation.count
            );
            if (groupedCameraLocation) {
              studyAreaInformation.cameraLocation = new CameraLocationModel(
                groupedCameraLocation.cameraLocation,
              ).dump();
            }
            rootStudyAreas.push(studyAreaInformation);
          }
        });

        // Step 2. generate children for the each parent.
        studyAreas.forEach(studyArea => {
          if (studyArea.parent) {
            const studyAreaInformation = studyArea.dump();
            const parent = rootStudyAreas.find(
              rootStudyArea => rootStudyArea.id === `${studyArea.parent}`,
            );
            const failure = failures.find(
              x => `${x._id}` === `${studyArea._id}`,
            );
            const groupedCameraLocation = groupedCameraLocations.find(
              x => `${x._id}` === `${studyArea._id}`,
            );
            const groupedLockedCameraLocation = groupedLockedCameraLocations.find(
              x => `${x._id}` === `${studyArea._id}`,
            );

            studyAreaInformation.failures = failure ? failure.count : 0;
            studyAreaInformation.isLockedAllCameraLocation = !!(
              groupedLockedCameraLocation &&
              groupedLockedCameraLocation.count === groupedCameraLocation.count
            );
            if (groupedCameraLocation) {
              studyAreaInformation.cameraLocation = new CameraLocationModel(
                groupedCameraLocation.cameraLocation,
              ).dump();
            }
            if (parent) {
              parent.failures += studyAreaInformation.failures;
              parent.children.push(studyAreaInformation);
            }
          }
        });

        res.json(rootStudyAreas);
      },
    ),
);

exports.addProjectStudyArea = auth(UserPermission.all(), (req, res) => {
  /*
  POST /api/v1/projects/:projectId/study-areas
   */
  const form = new StudyAreaForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const tasks = [ProjectModel.findById(req.params.projectId)];
  if (form.parent) {
    tasks.push(
      StudyAreaModel.findById(form.parent)
        .where({ project: req.params.projectId })
        .where({ state: StudyAreaState.active }),
    );
  }
  return Promise.all(tasks)
    .then(([project, parent]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (form.parent && !parent) {
        throw new errors.Http404();
      }
      if (parent && parent.parent) {
        throw new errors.Http400('Can not add the three-tier study-area.');
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }

      const studyArea = new StudyAreaModel({
        ...form,
        project,
        parent: parent || undefined,
      });
      return studyArea.save();
    })
    .then(studyArea => {
      res.json(studyArea.dump());
    });
});

exports.updateProjectStudyArea = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/study-areas/:studyAreaId
   */
  const form = new StudyAreaForm(req.body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const tasks = [
    ProjectModel.findById(req.params.projectId),
    StudyAreaModel.findById(req.params.studyAreaId)
      .where({ project: req.params.projectId })
      .where({ state: StudyAreaState.active }),
  ];

  return Promise.all(tasks)
    .then(([project, studyArea]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!studyArea) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }

      // fill parent, prevent Object.assign overwrite studyArea.parent
      if (studyArea.parent) {
        form.parent = studyArea.parent
      }
      Object.assign(studyArea, form);

      return studyArea.save();
    })
    .then(studyArea => {
      res.json(studyArea.dump());
    });
});
