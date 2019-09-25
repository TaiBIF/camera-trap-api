const utils = require('./common/utils');
const mediaWorker = require('./tasks/media-worker');
const updateProjectAnnotationTime = require('./tasks/update-project-annotation-time');
const TaskWorker = require('./models/const/task-worker');
const logger = require('./logger');

/*
pm2 gracefulReload flow:
  0s: start the new process
  2s: pm2 send the `shutdown` message to the old process
  10s: the old process be killed
 */

const queue = utils.getTaskQueue();

const mediaWorkerConcurrency = 1;

setTimeout(() => {
  queue.process(TaskWorker.mediaWorker, mediaWorkerConcurrency, mediaWorker);
  queue.process(
    TaskWorker.updateProjectAnnotationTime,
    1,
    updateProjectAnnotationTime,
  );
}, 10000);

process.on('message', message => {
  if (message !== 'shutdown') {
    return;
  }

  logger.info('task-worker is shutting down');
  queue.shutdown(2000, error => {
    utils.logError(error);
  });
});
