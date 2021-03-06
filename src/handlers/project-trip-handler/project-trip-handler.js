const mongoose = require('mongoose');
const auth = require('../../auth/authorization');
const UserPermission = require('../../models/const/user-permission');
const errors = require('../../models/errors');
const PageList = require('../../models/page-list');
const ProjectTripStudyAreaForm = require('../../forms/project/project-trip-study-area.form');
const ProjectTripForm = require('../../forms/project/project-trip-form');
const ProjectTripCameraForm = require('../../forms/project/project-trip-camera-form');
const ProjectTripSearchFrom = require('../../forms/project/project-trip-search-form');
const ProjectTripModel = require('../../models/data/project-trip-model');
const CameraLocationModel = require('../../models/data/camera-location-model');
const ProjectModel = require('../../models/data/project-model');

// 搜尋行程可用相機時間區間
exports.getProjectTripsDateTimeInterval = auth(
  UserPermission.all(),
  async (req, res) => {
    /*
    GET /api/v1/projects/{projectId}/trips/{tripId}
  */
    const { projectId, tripId } = req.params;

    const projectTripStartActiveDate = await ProjectTripModel.aggregate([
      {
        $match: {
          project: mongoose.Types.ObjectId(projectId),
          _id: mongoose.Types.ObjectId(tripId),
        },
      },
      { $unwind: '$studyAreas' },
      { $unwind: '$studyAreas.cameraLocations' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras.startActiveDate' },
      {
        $project: {
          startActiveDate:
            '$studyAreas.cameraLocations.projectCameras.startActiveDate',
        },
      },
      { $sort: { startActiveDate: 1 } },
    ]);

    const projectTripEndActiveDate = await ProjectTripModel.aggregate([
      {
        $match: {
          project: mongoose.Types.ObjectId(projectId),
          _id: mongoose.Types.ObjectId(tripId),
        },
      },
      { $unwind: '$studyAreas' },
      { $unwind: '$studyAreas.cameraLocations' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras' },
      { $unwind: '$studyAreas.cameraLocations.projectCameras.endActiveDate' },
      {
        $project: {
          endActiveDate:
            '$studyAreas.cameraLocations.projectCameras.endActiveDate',
        },
      },
      { $sort: { endActiveDate: -1 } },
    ]);

    if (projectTripStartActiveDate[0] && projectTripEndActiveDate[0]) {
      res.json({
        startTime: projectTripStartActiveDate[0].startActiveDate,
        endTime: projectTripEndActiveDate[0].endActiveDate,
      });
    } else if (projectTripStartActiveDate[0]) {
      res.json({
        startTime: projectTripStartActiveDate[0].startActiveDate,
        endTime: projectTripStartActiveDate[0].startActiveDate,
      });
    } else if (projectTripEndActiveDate[0]) {
      res.json({
        startTime: projectTripEndActiveDate[0].endActiveDate,
        endTime: projectTripEndActiveDate[0].endActiveDate,
      });
    } else {
      res.json({
        startTime: '',
        endTime: '',
      });
    }
  },
);

// 搜尋行程可用相機 List
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
  }).then(async result => {
    // 比對studyArea 是否符合 studyAreaId
    // eslint-disable-next-line no-restricted-syntax
    for (const doc of result.docs) {
      // eslint-disable-next-line no-restricted-syntax
      for (const studyAreaVal of doc.studyAreas) {
        // eslint-disable-next-line no-restricted-syntax
        for (const cameraLocationVal of studyAreaVal.cameraLocations) {
          // eslint-disable-next-line no-await-in-loop
          const cameraName = await CameraLocationModel.findById(
            cameraLocationVal.cameraLocation,
          );
          console.log('\x1b[32m', '\n---------- DEBUG ----------\n');
          console.log('\x1b[36m', ' data = ', cameraName);
          console.log('\x1b[32m', '\n---------------------------', '\x1b[0m');
          // Object.assign(cameraLocationVal, cameraLocationVal.title);
          if (cameraName) {
            // eslint-disable-next-line no-await-in-loop
            cameraLocationVal.title = await cameraName.name;
          } else {
            // eslint-disable-next-line no-await-in-loop
            cameraLocationVal.title = await 'null';
          }
        }
      }
    }

    await res.json(
      new PageList(form.index, form.size, result.totalDocs, result.docs),
    );
  });
});

// 新增行程相機
exports.addProjectTrip = auth(UserPermission.all(), (req, res) => {
  /*
      POST /api/v1/projects/{projectId}/trips
   */
  const form = new ProjectTripForm(req.body);
  const studyAreaForm = new ProjectTripStudyAreaForm(req.body);
  const { projectId } = req.params;
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  const errorStudyAreaMessage = studyAreaForm.validate();
  if (errorStudyAreaMessage) {
    throw new errors.Http400(errorStudyAreaMessage);
  }

  return Promise.all([ProjectModel.findById(projectId)])
    .then(([project]) => {
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      const result = new ProjectTripModel({
        project: projectId,
        ...form,
        ...studyAreaForm,
      });
      return Promise.all([result.save()]);
    })
    .then(([project]) => {
      res.json(project.dump());
    });
});

// 更新單一行程
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

// 刪除單一行程
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

// 更新行程相機
exports.updateProjectTripCameraByTripId = auth(
  UserPermission.all(),
  (req, res) => {
    /*
      PUT /api/v1/projects/{projectId}/trips/{tripId}/cameraLocations/{cameraLocationId}/camera/{cameraId}
 */
    const form = new ProjectTripCameraForm(req.body);
    const {
      projectId,
      tripId,
      studyAreaId,
      cameraLocationId,
      cameraId,
    } = req.params;
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }

    return Promise.all([
      ProjectModel.findById(projectId),
      ProjectTripModel.findById(tripId).where({ project: projectId }),
    ])
      .then(async ([project, projectTrip]) => {
        if (!projectTrip) {
          throw new errors.Http404('Cannot find project trip');
        }
        if (!project.canManageBy(req.user)) {
          throw new errors.Http403();
        }

        // 比對studyArea 是否符合 studyAreaId
        projectTrip.studyAreas.forEach(studyAreaVal => {
          // eslint-disable-next-line eqeqeq
          if (studyAreaVal.studyArea == studyAreaId) {
            // cameralocations 是否符合 cameraLocationId
            studyAreaVal.cameraLocations.forEach(cameraLocationVal => {
              // eslint-disable-next-line eqeqeq
              if (cameraLocationVal.cameraLocation == cameraLocationId) {
                // projectCamera 是否存在 與 projectCamera sn 唯一 若存在則拋出錯誤
                cameraLocationVal.projectCameras.forEach(projectCameraVal => {
                  if (projectCameraVal) {
                    if (
                      projectCameraVal.cameraSn === form.cameraSn &&
                      // 當其他相機sn 設置成這個
                      // eslint-disable-next-line eqeqeq
                      projectCameraVal._id != cameraId
                    ) {
                      throw new errors.Http400('Camera sn re-create');
                    }
                  }
                });
                // 更新行程相機
                cameraLocationVal.projectCameras.forEach(projectCameraVal => {
                  // eslint-disable-next-line eqeqeq
                  if (projectCameraVal._id == cameraId) {
                    Object.assign(projectCameraVal, form);
                  }
                });
                // 設置 相機事件
                cameraLocationVal.cameraLocationEvent =
                  form.cameraLocationEvent;

                // 新增判斷 cameraLocationMark 才去更新
                if (form.cameraLocationMark) {
                  cameraLocationVal.cameraLocationMark =
                    form.cameraLocationMark;
                  Object.assign(cameraLocationVal.cameraLocationMark);
                }
              }
            });
          }
        });
        return projectTrip.save();
      })
      .then(projectTrip => {
        res.json(projectTrip.dump());
      });
  },
);

// 新增行程相機
exports.addProjectTripCameraByTripId = auth(
  UserPermission.all(),
  (req, res) => {
    /*
      POST /api/v1/projects/{projectId}/trips/{tripId}/cameraLocations/{cameraLocationId}/camera/
 */
    const form = new ProjectTripCameraForm(req.body);
    const { projectId, tripId, studyAreaId, cameraLocationId } = req.params;
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }

    return Promise.all([
      ProjectModel.findById(projectId),
      ProjectTripModel.findById(tripId).where({ project: projectId }),
    ])
      .then(async ([project, projectTrip]) => {
        if (!projectTrip) {
          throw new errors.Http404('Cannot find project trip');
        }
        if (!project.canManageBy(req.user)) {
          throw new errors.Http403();
        }

        // 比對studyArea 是否符合 studyAreaId
        projectTrip.studyAreas.forEach(studyAreaVal => {
          // eslint-disable-next-line eqeqeq
          if (studyAreaVal.studyArea == studyAreaId) {
            // cameralocations 是否符合 cameraLocationId
            studyAreaVal.cameraLocations.forEach(cameraLocationVal => {
              // eslint-disable-next-line eqeqeq
              if (cameraLocationVal.cameraLocation == cameraLocationId) {
                // projectCamera 是否存在 與 projectCamera sn 唯一 若存在則拋出錯誤
                cameraLocationVal.projectCameras.forEach(projectCameraVal => {
                  if (projectCameraVal) {
                    if (projectCameraVal.cameraSn === form.cameraSn) {
                      throw new errors.Http400('Camera sn re-create');
                    }
                  }
                });
                // 新增行程相機

                // 若不存在
                cameraLocationVal.cameraLocationEvent =
                  form.cameraLocationEvent;
                Object.assign(
                  cameraLocationVal.projectCameras,
                  cameraLocationVal.projectCameras.push(form),
                );

                // 新增判斷 cameraLocationMark 才去更新
                if (form.cameraLocationMark) {
                  cameraLocationVal.cameraLocationMark =
                    form.cameraLocationMark;
                  Object.assign(cameraLocationVal.cameraLocationMark);
                }
              }
            });
          }
        });
        return projectTrip.save();
      })
      .then(projectTrip => {
        res.json(projectTrip.dump());
      });
  },
);
