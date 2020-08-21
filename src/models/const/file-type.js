module.exports = {
  projectCoverImage: 'project-cover-image',
  annotationImage: 'annotation-image',
  annotationVideo: 'annotation-video',
  annotationCSV: 'annotation-csv',
  annotationExcel: 'annotation-excel',
  annotationZIP: 'annotation-zip',
  issueAttachment: 'issue-attachment',
  all() {
    return [
      this.projectCoverImage,
      this.annotationImage,
      this.annotationVideo,
      this.annotationCSV,
      this.annotationExcel,
      this.annotationZIP,
      this.issueAttachment,
    ];
  },
};
