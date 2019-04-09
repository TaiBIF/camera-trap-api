module.exports = class MediaWorkerData {
  constructor(args) {
    this.fileType = args.fileType;
    this.userId = args.userId;
    this.projectId = args.projectId;
    this.fileId = args.fileId;
    this.uploadSessionId = args.uploadSessionId;
    this.cameraLocationId = args.cameraLocationId;
  }
};
