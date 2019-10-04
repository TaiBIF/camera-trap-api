const errors = require('../../models/errors');
const StudyAreaModel = require('../../models/data/study-area-model');
const ProjectModel = require('../../models/data/project-model');
const StudyAreaForm = require('../../forms/study-area/study-area-form');
const StudyAreaState = require('../../models/const/study-area-state');

/**
 * 建立樣區，子樣區
 * POST /api/v1/projects/:projectId/study-areas
 */
module.exports = async ({ body, params, user }, res) => {
  const form = new StudyAreaForm(body);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const project = await ProjectModel.findById(params.projectId);

  let parent;
  if (form.parent) {
    parent = StudyAreaModel.findById(form.parent)
      .where({ project: params.projectId })
      .where({ state: StudyAreaState.active });
  }

  if (!project) {
    throw new errors.Http404();
  }
  if (form.parent && !parent) {
    throw new errors.Http404();
  }
  if (parent && parent.parent) {
    throw new errors.Http400('Can not add the three-tier study-area.');
  }
  if (!project.canManageBy(user)) {
    throw new errors.Http403();
  }

  const studyArea = new StudyAreaModel({ ...form, project, parent });

  try {
    await studyArea.save();
    res.json(studyArea.dump());
  } catch (e) {
    if (e.code === 11000) {
      throw new errors.Http409('名稱重複');
    }

    throw e;
  }
};
