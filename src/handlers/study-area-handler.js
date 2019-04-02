const auth = require('../auth/authorization');
const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const ProjectRole = require('../models/const/project-role');
const StudyAreaForm = require('../forms/study-area/study-area-form');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');

exports.getProjectStudyAreas = auth(UserPermission.all(), (req, res) =>
  /*
  GET /api/v1/projects/:projectId/study-areas
   */
  Promise.all([
    ProjectModel.findById(req.params.projectId),
    StudyAreaModel.where({ state: StudyAreaState.active })
      .where({ project: req.params.projectId })
      .sort('title.zh-TW'),
  ]).then(([project, studyAreas]) => {
    if (!project) {
      throw new errors.Http404();
    }
    if (
      req.user.permission !== UserPermission.administrator &&
      !project.members.find(x => `${x.user._id}` === `${req.user._id}`)
    ) {
      throw new errors.Http403();
    }

    const rootStudyAreas = [];
    studyAreas.forEach(studyArea => {
      if (!studyArea.parent) {
        const studyAreaInformation = studyArea.dump();
        studyAreaInformation.children = [];
        rootStudyAreas.push(studyAreaInformation);
      }
    });
    studyAreas.forEach(studyArea => {
      if (studyArea.parent) {
        const parent = rootStudyAreas.find(
          rootStudyArea => rootStudyArea.id === `${studyArea.parent}`,
        );
        if (parent) {
          parent.children.push(studyArea.dump());
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

  const query = [ProjectModel.findById(req.params.projectId)];
  if (form.parent) {
    query.push(
      StudyAreaModel.findById(form.parent).where({
        state: StudyAreaState.active,
      }),
    );
  }
  return Promise.all(query)
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
      const member = project.members.find(
        item => `${item.user._id}` === `${req.user._id}`,
      );
      if (
        req.user.permission !== UserPermission.administrator &&
        (!member || member.role !== ProjectRole.manager)
      ) {
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
