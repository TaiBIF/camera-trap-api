const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');
const AnnotationRevisionModel = require('../models/data/annotation-revision-model');
const AnnotationRevisionsSearchForm = require('../forms/annotation-revision/annotation-revisions-search-form');

exports.getAnnotationRevisions = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/annotations/:annotationId/revisions
   */
  const form = new AnnotationRevisionsSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = AnnotationRevisionModel.where({
    annotation: req.params.annotationId,
  })
    .sort(form.sort)
    .populate('user');
  return Promise.all([
    AnnotationModel.findById(req.params.annotationId)
      .where({ state: AnnotationState.active })
      .populate('project'),
    AnnotationRevisionModel.paginate(query, {
      offset: form.index * form.size,
      limit: form.size,
    }),
  ]).then(([annotation, revisions]) => {
    if (!annotation) {
      throw new errors.Http404();
    }
    if (
      req.user.permission !== UserPermission.administrator &&
      !annotation.project.members.find(
        x => `${x.user._id}` === `${req.user._id}`,
      )
    ) {
      throw new errors.Http403();
    }

    res.json(
      new PageList(form.index, form.size, revisions.totalDocs, revisions.docs),
    );
  });
});

exports.rollbackAnnotation = auth(UserPermission.all(), (req, res) =>
  /*
  POST /api/v1/annotations/:annotationId/revisions/:revisionId/_rollback
   */
  Promise.all([
    AnnotationModel.findById(req.params.annotationId)
      .where({ state: AnnotationState.active })
      .populate('project'),
    AnnotationRevisionModel.findById(req.params.revisionId),
    AnnotationRevisionModel.where({
      annotation: req.params.annotationId,
      isCurrent: true,
    }),
  ])
    .then(([annotation, annotationRevision, currentAnnotationRevisions]) => {
      if (!annotation) {
        throw new errors.Http404();
      }
      if (!annotationRevision) {
        throw new errors.Http404();
      }
      if (
        req.user.permission !== UserPermission.administrator &&
        !annotation.project.members.find(
          x => `${x.user._id}` === `${req.user._id}`,
        )
      ) {
        throw new errors.Http403();
      }

      const tasks = currentAnnotationRevisions.map(x => {
        x.isCurrent = false;
        return x.save();
      });
      annotationRevision.isCurrent = true;
      annotation.filename = annotationRevision.filename;
      annotation.file = annotationRevision.file;
      annotation.time = annotationRevision.time;
      annotation.species = annotationRevision.species;
      annotation.fields = annotationRevision.fields;
      tasks.unshift(annotationRevision.save());
      tasks.push(annotation.save());
      return Promise.all(tasks);
    })
    .then(([annotationRevision]) => {
      res.json(annotationRevision.dump());
    }),
);
