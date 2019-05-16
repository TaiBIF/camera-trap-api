const utils = require('../common/utils');
const ProjectModel = require('../models/data/project-model');
const AnnotationModel = require('../models/data/annotation-model');
const AnnotationState = require('../models/const/annotation-state');

module.exports = (job, done) => {
  let promise;

  ProjectModel.where()
    .cursor()
    .on('error', error => {
      utils.logError(error);
      done(error);
    })
    .on('close', () => {
      Promise.resolve(promise).then(done);
    })
    .on('data', project => {
      promise = Promise.resolve(promise)
        .then(() =>
          Promise.all([
            AnnotationModel.where({
              project: project._id,
              state: AnnotationState.active,
            })
              .sort('time')
              .limit(1)
              .findOne(),
            AnnotationModel.where({
              project: project._id,
              state: AnnotationState.active,
            })
              .sort('-time')
              .limit(1)
              .findOne(),
          ]),
        )
        .then(([oldestAnnotation, latestAnnotation]) => {
          if (!oldestAnnotation) {
            // There is no annotation of this project.
            return;
          }

          let isDifferent =
            !project.oldestAnnotationTime || !project.latestAnnotationTime;
          isDifferent =
            isDifferent ||
            project.oldestAnnotationTime.getTime() !==
              oldestAnnotation.time.getTime();
          isDifferent =
            isDifferent ||
            project.latestAnnotationTime.getTime() !==
              latestAnnotation.time.getTime();
          if (isDifferent) {
            project.oldestAnnotationTime = oldestAnnotation.time;
            project.latestAnnotationTime = latestAnnotation.time;
            return project.save();
          }
        })
        .catch(error => {
          utils.logError(error, { project });
        });
    });
};
