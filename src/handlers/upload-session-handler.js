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

  const query = UploadSessionModel.where({ user: `${req.user._id}` })
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

      return Promise.all([
        uploadSession,
        AnnotationModel.update(
          {
            uploadSession: uploadSession._id,
            state: AnnotationState.waitForReview,
          },
          { state: AnnotationState.cancel },
          { multi: true },
        ),
      ]);
    })
    .then(([uploadSession]) => {
      uploadSession.state = UploadSessionState.cancel;
      return uploadSession.save();
    })
    .then(uploadSession => {
      res.json(uploadSession.dump());
    }),
);
