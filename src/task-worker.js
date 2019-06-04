const kue = require('kue');
const utils = require('./common/utils');
const mediaWorker = require('./tasks/media-worker');
const updateProjectAnnotationTime = require('./tasks/update-project-annotation-time');
const TaskWorker = require('./models/const/task-worker');

/*
pm2 gracefulReload flow:
  0s: start the new process
  2s: pm2 send the `shutdown` message to the old process
  10s: the old process be killed
 */

const queue = utils.getTaskQueue();

setTimeout(() => {
  console.log('task-worker is start.');
  queue.process(TaskWorker.mediaWorker, 1, mediaWorker);
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
  // pm2 gracefulReload
  console.log('task-worker is shutting down.');
  queue.shutdown(2000, error => {
    utils.logError(error);
  });
});
