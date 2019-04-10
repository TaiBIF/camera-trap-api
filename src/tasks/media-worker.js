const fs = require('fs');
const util = require('util');
const path = require('path');
const config = require('config');
const csvParse = require('csv-parse');
const extract = require('extract-zip');
const pLimit = require('p-limit');
const tmp = require('tmp');
const utils = require('../common/utils');
const errors = require('../models/errors');
const MediaWorkerData = require('../models/dto/media-worker-data');
const UserModel = require('../models/data/user-model');
const UserPermission = require('../models/const/user-permission');
const FileModel = require('../models/data/file-model');
const FileType = require('../models/const/file-type');
require('../models/data/exchangeable-image-file-model'); // for populate
const UploadSessionModel = require('../models/data/upload-session-model');
const UploadSessionState = require('../models/const/upload-session-state');
const UploadSessionErrorType = require('../models/const/upload-session-error-type');
const ProjectModel = require('../models/data/project-model');
require('../models/data/data-field-model'); // for populate
const CameraLocationModel = require('../models/data/camera-location-model');
const CameraLocationState = require('../models/const/camera-location-state');
const StudyAreaModel = require('../models/data/study-area-model');
const StudyAreaState = require('../models/const/study-area-state');
const SpeciesModel = require('../models/data/species-model');
const AnnotationModel = require('../models/data/annotation-model');

module.exports = (job, done) => {
  const workerData = new MediaWorkerData(job.data);
  let _user;
  let _project;
  let _file;
  let _uploadSession;
  let _cameraLocation;
  let _allStudyAreas; // only for zip or csv type.
  let _allCameraLocations; // only for zip or csv type.
  let _allSpecies; // only for zip or csv type.

  if (config.isDebug) {
    console.log(`media-worker job[${job.id}] start.`);
    console.log(JSON.stringify(job.data, null, 2));
  }
  Promise.all([
    UserModel.findById(workerData.userId),
    (() => {
      const query = ProjectModel.findById(workerData.projectId);
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        // populate .dataFields for csv and zip file.
        return query.populate('dataFields');
      }
      return query;
    })(),
    FileModel.findById(workerData.fileId)
      .where({ project: workerData.projectId })
      .populate('exif'),
    UploadSessionModel.findById(workerData.uploadSessionId)
      .where({ project: workerData.projectId })
      .where({ file: workerData.fileId }),
    CameraLocationModel.findById(workerData.cameraLocationId)
      .where({ project: workerData.projectId })
      .where({ state: CameraLocationState.active })
      .populate('studyArea'),
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return StudyAreaModel.where({ project: workerData.projectId })
          .where({ state: StudyAreaState.active })
          .find();
      }
    })(),
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return CameraLocationModel.where({ project: workerData.projectId })
          .where({ state: CameraLocationState.active })
          .find();
      }
    })(),
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return SpeciesModel.where({ project: workerData.projectId }).find();
      }
    })(),
  ])
    .then(
      ([
        user,
        project,
        file,
        uploadSession,
        cameraLocation,
        allStudyAreas,
        allCameraLocations,
        allSpecies,
      ]) => {
        /*
        - Export user, project, file, upload session, camera location.
        - Do authorization.
        - Do validations.
         */
        _user = user;
        _project = project;
        _file = file;
        _uploadSession = uploadSession;
        _cameraLocation = cameraLocation;
        _allStudyAreas = allStudyAreas;
        _allCameraLocations = allCameraLocations;
        _allSpecies = allSpecies;

        // Check user, project, file, uploadSession isn't null.
        if (!user) {
          throw new errors.Http400();
        }
        if (!project) {
          throw new errors.Http400();
        }
        if (!file) {
          throw new errors.Http400();
        }
        if (!uploadSession) {
          throw new errors.Http400();
        }
        // Check the user is a member of the project.
        if (
          user.permission !== UserPermission.administrator &&
          !project.members.find(x => `${x.user._id}` === `${user._id}`)
        ) {
          _uploadSession.errorType = UploadSessionErrorType.permissionDenied;
          throw new errors.Http403();
        }
        // Do validations for each the file type.
        switch (file.type) {
          case FileType.annotationImage:
            if (!cameraLocation) {
              throw new errors.Http404('Camera location is not found.');
            }
            if (
              !cameraLocation.studyArea ||
              cameraLocation.studyArea.state !== StudyAreaState.active
            ) {
              throw new errors.Http404('Study area is not found.');
            }
            break;
          case FileType.annotationZIP:
          default:
        }
      },
    )
    .then(
      /*
      - Unzip the file from S3.
      @returns {Promise<{DirSyncObject|null}>}
       */
      () =>
        new Promise((resolve, reject) => {
          if (_file.type !== FileType.annotationZIP) {
            return resolve();
          }

          const s3 = utils.getS3();
          const tempFile = tmp.fileSync();
          const tempDir = tmp.dirSync();
          const file = fs.createWriteStream(tempFile.name);

          file.on('close', () => {
            extract(tempFile.name, { dir: tempDir.name }, error => {
              if (error) {
                return reject(error);
              }
              tempFile.removeCallback();
              resolve(tempDir);
            });
          });
          s3.getObject({
            Bucket: config.s3.bucket,
            Key: `${config.s3.folders.annotationZIPs}/${_file.getFilename()}`,
          })
            .createReadStream()
            .on('error', error => {
              tempFile.removeCallback();
              tempDir.removeCallback();
              reject(error);
            })
            .pipe(file);
        }),
    )
    .then(tempDir => {
      /*
      - Upload files to S3.
      - Create annotations without saving.
      @param tempDir {DirSyncObject|null} The folder of the unzip files.
      @returns {Promise<[{AnnotationModel}]>}
       */
      if (_file.type === FileType.annotationZIP) {
        const limit = pLimit(4);
        return Promise.all(
          fs.readdirSync(tempDir.name).map(filename =>
            limit(() => {
              const file = new FileModel({
                type: FileType.annotationImage,
                project: _project,
                user: _user,
                originalFilename: filename,
              });
              if (['jpg', 'png'].indexOf(file.getExtensionName()) < 0) {
                return;
              }

              return file
                .saveWithContent(
                  fs.readFileSync(path.join(tempDir.name, filename)),
                )
                .then(() => {
                  fs.unlinkSync(path.join(tempDir.name, filename));
                  if (!file.exif || !file.exif.dateTime) {
                    _uploadSession.errorType =
                      UploadSessionErrorType.lostExifTime;
                    throw new errors.Http400(
                      `${file.originalFilename} lost exif.`,
                    );
                  }
                  return new AnnotationModel({
                    project: _project,
                    studyArea: _cameraLocation.studyArea,
                    cameraLocation: _cameraLocation,
                    file,
                    filename: file.originalFilename,
                    time: file.exif.dateTime,
                  });
                });
            }),
          ),
        ).then((annotations = []) => {
          /*
          - Remove temp dir.
          - Filter empty items in the array. (some files are not jop or png.)
           */
          tempDir.removeCallback();
          const result = [];
          annotations.forEach(annotation => {
            if (annotation) {
              result.push(annotation);
            }
          });
          return result;
        });
      }

      if (_file.type === FileType.annotationCSV) {
        const csvParseAsync = util.promisify(csvParse);
        let result;
        return utils
          .getS3Object(
            `${config.s3.folders.annotationCSVs}/${_file.getFilename()}`,
          )
          .then(data => csvParseAsync(data.Body))
          .then(csvObject => {
            const limit = pLimit(5);
            result = utils.convertCsvToAnnotations({
              project: _project,
              studyAreas: _allStudyAreas,
              dataFields: _project.dataFields,
              cameraLocations: _allCameraLocations,
              species: _allSpecies,
              csvObject,
            });
            // Save new species.
            return Promise.all(
              result.newSpecies.map(x => limit(() => x.save())),
            );
          })
          .then(() => result.annotations); // Annotations are missing .file.
      }

      // _file.type === FileType.annotationImage
      return [
        new AnnotationModel({
          project: _project,
          studyArea: _cameraLocation.studyArea,
          cameraLocation: _cameraLocation,
          file: _file,
          filename: _file.originalFilename,
          time: _file.exif.dateTime,
        }),
      ];
    })
    .then((annotations = []) => {
      /*
      - Find the duplicate annotation.
        使用樣區、相機位置、檔名、時間檢查是否已存在 annotation，存在的話需要替換 annotation.file。
      @param annotations {Promise<[{AnnotationModel}]>} Not saved.
      @returns {Promise<[{AnnotationModel}, {AnnotationModel}]>}
        (new annotations, duplicate annotations)
       */
      const statements = annotations.map(annotation => ({
        $and: [
          { cameraLocation: annotation.cameraLocation._id },
          { filename: annotation.filename },
          { time: annotation.time },
        ],
      }));

      return Promise.all([
        annotations,
        AnnotationModel.find({ $or: statements }),
      ]);
    })
    .then(([annotations, duplicateAnnotations]) => {
      /*
      - If the duplicate annotation is exists then update the file of the duplicate one.
      - If there is no duplicate annotation then save a new annotation.
      @returns {Promise<[AnnotationModel]>}
       */
      const tasks = [];

      annotations.forEach(annotation => {
        const duplicateAnnotation = duplicateAnnotations.find(
          x =>
            `${x.cameraLocation._id}` === `${annotation.cameraLocation._id}` &&
            x.filename === annotation.filename &&
            x.time.getTime() === annotation.time.getTime(),
        );
        if (duplicateAnnotation) {
          // Replace the old file with a new one.
          if (
            [FileType.annotationImage, FileType.annotationZIP].indexOf(
              _file.type,
            ) >= 0
          ) {
            // The user upload images so we should replace with a new file.
            duplicateAnnotation.file = annotation.file;
          } else {
            // FileType.annotationCSV
            // We should apply the information from csv to annotations.
            duplicateAnnotation.species = annotation.species;
            duplicateAnnotation.customFields = annotation.customFields;
            duplicateAnnotation.rawData = annotation.rawData;
          }
          tasks.push(duplicateAnnotation.saveAndAddRevision(_user));
        } else {
          tasks.push(annotation.saveAndAddRevision(_user));
        }
      });
      return Promise.all(tasks);
    })
    .then(() => {
      /*
      Set the upload session as success and save it.
      @returns {Promise<UploadSessionModel>}
       */
      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.success;
        return _uploadSession.save();
      }
    })
    .then(() => {
      if (config.isDebug) {
        console.log(`media-worker job[${job.id}] done.`);
      }
      done();
    })
    .catch(error => {
      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.failure;
        _uploadSession.errorType =
          _uploadSession.errorType || UploadSessionErrorType.others;
        _uploadSession.save();
      }
      utils.logError(error, job.data);
      done(error);
    });
};
