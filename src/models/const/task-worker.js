module.exports = {
  mediaWorker: 'media-worker',
  updateProjectAnnotationTime: 'update-project-annotation-time',
  all() {
    return [this.mediaWorker, this.updateProjectAnnotationTime];
  },
};
