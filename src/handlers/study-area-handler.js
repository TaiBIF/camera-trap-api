const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const StudyAreaForm = require('../forms/study-area/study-area-form');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');

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
      if (
        req.user.permission !== UserPermission.administrator &&
        !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
      ) {
        throw new errors.Http403();
      }

      return Promise.all([
        studyAreas,
        AnnotationModel.aggregate([
          {
            $match: {
              studyArea: { $in: studyAreas.map(x => x._id) },
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
      ]);
    })
    .then(([studyAreas, failures]) => {
      // Step 1. generate parents.
      const rootStudyAreas = [];
      studyAreas.forEach(studyArea => {
        if (!studyArea.parent) {
          const failure = failures.find(x => `${x._id}` === `${studyArea._id}`);
          const studyAreaInformation = studyArea.dump();
          studyAreaInformation.children = [];
          studyAreaInformation.failures = failure ? failure.count : 0;
          rootStudyAreas.push(studyAreaInformation);
        }
      });

      // Step 2. generate children for the each parent.
      studyAreas.forEach(studyArea => {
        if (studyArea.parent) {
          const failure = failures.find(x => `${x._id}` === `${studyArea._id}`);
          const parent = rootStudyAreas.find(
            rootStudyArea => rootStudyArea.id === `${studyArea.parent}`,
          );
          const studyAreaInformation = studyArea.dump();
          studyAreaInformation.failures = failure ? failure.count : 0;
          if (parent) {
            parent.failures += studyAreaInformation.failures;
            parent.children.push(studyAreaInformation);
          }
        }
      });

      res.json(rootStudyAreas);
    }),
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
