const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionsSearchForm = require('../forms/upload-session/upload-sessions-search-form');
const StudyAreaModel = require('../models/data/study-area-model');

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
