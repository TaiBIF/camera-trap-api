const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const PageList = require('../../models/page-list');
const ProjectTripStudyAreaForm = require('../../forms/project/project-trip-study-area.form');
const ProjectTripForm = require('../../forms/project/project-trip-form');
const ProjectTripSearchFrom = require('../../forms/project/project-trip-search-form');
const ProjectTripModel = require('../../models/data/project-trip-model');
const ProjectModel = require('../../models/data/project-model');

exports.getProjectTrips = auth(UserPermission.all(), (req, res) => {
  /*
      GET /api/v1/projects/{projectId}/trips
   */
  const form = new ProjectTripSearchFrom(req.query);
  const errorMessage = form.validate();
  const { projectId } = req.params;
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectTripModel.where({ project: projectId });
  if (form.sn) {
    query.where({
      sn: { $regex: `${form.sn}`, $options: 'i' },
    });
  }
  if (form.member) {
    query.where({ member: { $regex: `${form.member}`, $options: 'i' } });
  }
  if (form.mark) {
    query.where({ mark: { $regex: `${form.mark}`, $options: 'i' } });
  }

  return ProjectTripModel.paginate(query.sort(form.sort), {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

exports.addProjectTrip = auth(UserPermission.all(), (req, res) => {
  /*
      POST /api/v1/projects/{projectId}/trips
   */
  const form = new ProjectTripForm(req.body);
  const { projectId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(projectId),
    ProjectTripModel.where({ project: projectId, sn: form.sn }).findOne(),
  ])
    .then(([project, projectTrapExist]) => {
      if (projectTrapExist) {
        throw new errors.Http400(
          'Cannot use the same "sn" to create project Trip',
        );
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      const result = new ProjectTripModel({
        project: projectId,
        ...form,
      });
      return Promise.all([result.save()]);
    })
    .then(([project]) => {
      res.json(project.dump());
    });
});

exports.updateProjectTripByTripId = auth(UserPermission.all(), (req, res) => {
  /*
      PUT /api/v1/projects/{projectId}/trips/{tripId}
 */
  const form = new ProjectTripForm(req.body);
  const studyAreaForm = new ProjectTripStudyAreaForm(req.body);
  const { projectId, tripId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return Promise.all([
    ProjectModel.findById(projectId),
    ProjectTripModel.findById(tripId).where({ project: projectId }),
  ])
    .then(([project, projectTrip]) => {
      if (!projectTrip) {
        throw new errors.Http404('Cannot find project trip');
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      Object.assign(projectTrip, form);
      Object.assign(projectTrip, studyAreaForm);
      return projectTrip.save();
    })
    .then(projectTrip => {
      res.json(projectTrip.dump());
    });
});

exports.deleteProjectTrapByTrapId = auth(UserPermission.all(), (req, res) => {
  /*
      Delete /api/v1/projects/{projectId}/trips/{tripId}
 */
  const { projectId, tripId } = req.params;

  return Promise.all([
    ProjectModel.findById(projectId),
    ProjectTripModel.findById(tripId).where({
      project: projectId,
    }),
  ])
    .then(([project, projectTrip]) => {
      if (!projectTrip) {
        throw new errors.Http404('Cannot find project trip');
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      projectTrip.deleteOne({ _id: tripId });
    })
    .then(() => {
      res.status(204).send();
    });
});
