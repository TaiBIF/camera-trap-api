const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionsSearchForm = require('../forms/upload-session/upload-sessions-search-form');
const UploadSessionState = require('../models/const/upload-session-state');
const StudyAreaModel = require('../models/data/study-area-model');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');

exports.getMyUploadSession = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/me/upload-sessions
   */
  const form = new UploadSessionsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = UploadSessionModel.where({ user: req.user._id })
    .sort(form.sort)
    .populate('project')
    .populate('cameraLocation')
    .populate('file');
  return UploadSessionModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  })
    .then(result =>
      Promise.all([
        result,
        StudyAreaModel.populate(result.docs, 'cameraLocation.studyArea'),
      ]),
    )
    .then(([result]) =>
      Promise.all([
        result,
        StudyAreaModel.populate(result.docs, 'cameraLocation.studyArea.parent'),
      ]),
    )
    .then(([result]) => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
});

exports.overwriteUploadSession = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/me/upload-session/:uploadSessionId/_overwrite
  Overwrite annotations of this upload session.
   */
  Promise.all([
    UploadSessionModel.findById(req.params.uploadSessionId),
    AnnotationModel.where({ uploadSession: req.params.uploadSessionId }),
  ])
    .then(([uploadSession, annotations]) => {
      if (!uploadSession) {
        throw new errors.Http404();
      }
      if (uploadSession.state !== UploadSessionState.waitForReview) {
        throw new errors.Http400();
      }
      if (`${uploadSession.user._id}` !== `${req.user._id}`) {
        throw new errors.Http403();
      }

      const statements = annotations.map(annotation => ({
        $and: [
          { state: AnnotationState.active },
          { cameraLocation: annotation.cameraLocation._id },
          { filename: annotation.filename },
          { time: annotation.time },
        ],
      }));
      return Promise.all([
        uploadSession,
        annotations,
        AnnotationModel.where({ $or: statements }),
      ]);
    })
    .then(([uploadSession, annotations, targetAnnotations]) => {
      uploadSession.state = UploadSessionState.success;
      const tasks = [uploadSession.save()];
      annotations.forEach(annotation => {
        const targetAnnotation = targetAnnotations.find(
          x =>
            `${x.cameraLocation._id}` === `${annotation.cameraLocation._id}` &&
            x.filename === annotation.filename &&
            x.time.getTime() === annotation.time.getTime(),
        );
        if (targetAnnotation) {
          // Overwrite the old annotation.
          targetAnnotation.failures = annotation.failures;
          targetAnnotation.file = annotation.file;
          targetAnnotation.species = annotation.species;
          targetAnnotation.fields = annotation.fields;
          targetAnnotation.rawData = annotation.rawData;
          tasks.push(targetAnnotation.saveAndAddRevision(req.user));
          annotation.state = AnnotationState.overwritten;
          tasks.push(annotation.save());
        } else {
          // Set the state of the new annotation as active.
          annotation.state = AnnotationState.active;
          tasks.push(annotation.saveAndAddRevision(req.user));
        }
      });
      return Promise.all(tasks);
    })
    .then(([uploadSession]) => {
      res.json(uploadSession.dump());
    }),
);

exports.cancelUploadSession = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/me/upload-sessions/:uploadSessionId/_cancel
  Don't overwrite annotations of this upload session.
   */
  UploadSessionModel.findById(req.params.uploadSessionId)
    .then(uploadSession => {
      if (!uploadSession) {
        throw new errors.Http404();
      }
      if (uploadSession.state !== UploadSessionState.waitForReview) {
        throw new errors.Http400();
      }
      if (`${uploadSession.user._id}` !== `${req.user._id}`) {
        throw new errors.Http403();
      }

      uploadSession.state = UploadSessionState.cancel;
      return Promise.all([
        uploadSession.save(),
        AnnotationModel.update(
          {
            uploadSession: uploadSession._id,
            state: AnnotationState.waitForReview,
          },
          {
            state: AnnotationState.cancel,
            updateTime: new Date(),
          },
          { multi: true },
        ),
      ]);
    })
    .then(([uploadSession]) => {
      res.json(uploadSession.dump());
    }),
);
