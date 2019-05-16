const cron = require('cron');
const utils = require('./common/utils');
const TaskWorker = require('./models/const/task-worker');

/*
Cron Ranges
  Seconds: 0-59
  Minutes: 0-59
  Hours: 0-23
  Day of Month: 1-31
  Months: 0-11
  Day of Week: 0-6
 */

const queue = utils.getTaskQueue();
const jobs = [];

jobs.push(
  new cron.CronJob({
    cronTime: '0 0 0,12 * * *',
    onTick: () => {
      const job = queue.create(TaskWorker.updateProjectAnnotationTime);
      job.save(error => {
        if (error) {
          utils.logError(error);
        }
      });
    },
  }),
);

setTimeout(() => {
  jobs.forEach(job => {
    job.start();
  });
}, 2000);

process.on('message', message => {
  if (message === 'shutdown') {
    jobs.forEach(job => {
      job.stop();
    });
  }
});
