const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const CameraLocationModel = require('../models/data/camera-location-model');
require('../models/data/project-model'); // for populate
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const AnnotationsSearchForm = require('../forms/annotation/annotations-search-form');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');

exports.getAnnotations = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/annotations
   */
  const form = new AnnotationsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  if (!form.studyArea && !form.cameraLocations.length) {
    throw new errors.Http400(
      'studyArea and cameraLocations least one should be not empty.',
    );
  }

  let tasks;
  if (form.studyArea) {
    tasks = [
      StudyAreaModel.findById(form.studyArea)
        .where({ state: StudyAreaState.active })
        .populate('project'),
      StudyAreaModel.where({ parent: form.studyArea }).where({
        state: StudyAreaState.active,
      }),
      CameraLocationModel.where({
        _id: { $in: form.cameraLocations },
      }).populate('project'),
    ];
  } else {
    // cameraLocations
    tasks = [
      null,
      null,
      CameraLocationModel.where({
        _id: { $in: form.cameraLocations },
      }).populate('project'),
    ];
  }
  return Promise.all(tasks)
    .then(([studyArea, childStudyAreas, cameraLocations]) => {
      if (form.studyArea) {
        if (!studyArea) {
          throw new errors.Http404();
        }
        if (
          req.user.permission !== UserPermission.administrator &&
          !studyArea.project.members.find(
            x => `${x.user._id}` === `${req.user._id}`,
          )
        ) {
          throw new errors.Http403();
        }
      }
      if (form.cameraLocations && form.cameraLocations.length) {
        if (form.cameraLocations.length !== cameraLocations.length) {
          throw new errors.Http404();
        }
        cameraLocations.forEach(cameraLocation => {
          if (
            req.user.permission !== UserPermission.administrator &&
            !cameraLocation.project.members.find(
              x => `${x.user._id}` === `${req.user._id}`,
            )
          ) {
            throw new errors.Http403();
          }
        });
      }

      const query = AnnotationModel.where({ state: AnnotationState.active })
        .populate('file')
        .sort(form.sort);
      if (studyArea) {
        const studyAreaIds = [`${studyArea._id}`];
        childStudyAreas.forEach(childStudyArea => {
          studyAreaIds.push(`${childStudyArea._id}`);
        });
        query.where({ studyArea: { $in: studyAreaIds } });
      }
      if (cameraLocations.length) {
        query.where({
          cameraLocation: { $in: cameraLocations.map(x => x._id) },
        });
      }
      return AnnotationModel.paginate(query, {
        offset: form.index * form.size,
        limit: form.size,
      });
    })
    .then(result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});
