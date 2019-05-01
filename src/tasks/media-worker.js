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
const AnnotationState = require('../models/const/annotation-state');

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
  let _isZipWithCsv; // The user upload a zip file include images and a csv.

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

    // Fetch all study areas of the project for csv data.
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

    // Fetch all camera locations of the project for csv data.
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

    // Fetch all species of the project for csv data.
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return SpeciesModel.where({ project: workerData.projectId });
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
          case FileType.annotationZIP:
          case FileType.annotationCSV:
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
          default:
        }
      },
    )
    .then(() => {
      /*
      - Unzip the file from S3 for FileType.annotationZIP.
      - Upload all files in the zip file to S3 for FileType.annotationZIP.
      @returns {Promise<[{FileModel}]>}
       */
      if (_file.type !== FileType.annotationZIP) {
        return [_file];
      }

      // _file.type === FileType.annotationZIP
      const tempFile = tmp.fileSync();
      const tempDir = tmp.dirSync();
      return new Promise((resolve, reject) => {
        /*
        - Download the zip file from S3.
        - Unzip the zip file to the local folder.
        @returns {Promise<>}
         */
        const s3 = utils.getS3();
        const file = fs.createWriteStream(tempFile.name);

        file.on('close', () => {
          extract(tempFile.name, { dir: tempDir.name }, error => {
            if (error) {
              return reject(error);
            }
            resolve();
          });
        });
        s3.getObject({
          Bucket: config.s3.bucket,
          Key: `${config.s3.folders.annotationZIPs}/${_file.getFilename()}`,
        })
          .createReadStream()
          .on('error', error => {
            reject(error);
          })
          .pipe(file);
      })
        .then(() => {
          /*
          - Create instances of FileModel for the each file at tempDir.
          - Upload unzip files at the tempDir to S3.
          - Check image files have exif.
          @returns {Promise<[{FileModel}]>}
           */
          const limit = pLimit(5); // Upload 5 files to S3 in the same time.
          return Promise.all(
            fs.readdirSync(tempDir.name).map(filename =>
              limit(() => {
                const file = new FileModel({
                  type: FileType.annotationImage,
                  project: _project,
                  user: _user,
                  originalFilename: filename,
                });
                const fileExtensionName = file.getExtensionName();
                if (['jpg', 'png', 'csv'].indexOf(fileExtensionName) < 0) {
                  fs.unlinkSync(path.join(tempDir.name, filename));
                  return;
                }
                const content = fs.readFileSync(
                  path.join(tempDir.name, filename),
                );
                if (fileExtensionName === 'csv') {
                  // Fix file.type
                  file.type = FileType.annotationCSV;
                  file.content = content; // The binary content will be used for convert to annotations.
                }

                return file.saveWithContent(content).then(() => {
                  fs.unlinkSync(path.join(tempDir.name, filename));
                  if (
                    file.type === FileType.annotationImage &&
                    (!file.exif || !file.exif.dateTime)
                  ) {
                    _uploadSession.errorType =
                      UploadSessionErrorType.lostExifTime;
                    throw new errors.Http400(
                      `${file.originalFilename} lost exif.`,
                    );
                  }
                  return file;
                });
              }),
            ),
          );
        })
        .then(files => {
          /*
          - Remove temp files.
          - Filter out empty items in files.
          @param files {Array<FileModel>}
           */
          tempFile.removeCallback();
          tempDir.removeCallback();
          const result = [];
          files.forEach(file => {
            if (file) {
              result.push(file);
            }
          });
          return result;
        })
        .catch(error => {
          tempFile.removeCallback();
          tempDir.removeCallback();
          throw error;
        });
    })
    .then(files => {
      /*
      - Validate image files and the csv are mapping for the file type is annotationZIP with csv.
      - Create annotations without saving.
      @param files {Array<FileModel>}
      @returns {Promise<[{AnnotationModel}]>}
       */
      const csvParseAsync = util.promisify(csvParse);

      if (_file.type === FileType.annotationCSV) {
        return utils
          .getS3Object(
            `${config.s3.folders.annotationCSVs}/${_file.getFilename()}`,
          )
          .then(data => csvParseAsync(data.Body))
          .then(csvObject => {
            const limit = pLimit(5); // Save 5 new species in the same time.
            const result = utils.convertCsvToAnnotations({
              project: _project,
              studyAreas: _allStudyAreas,
              dataFields: _project.dataFields,
              cameraLocations: _allCameraLocations,
              uploadSession: _uploadSession,
              species: _allSpecies,
              csvObject,
            });
            // Save new species.
            const tasks = result.newSpecies.map(x => limit(() => x.save()));
            tasks.unshift(result);
            return Promise.all(tasks);
          })
          .then(([result]) => result.annotations); // Annotations are missing .file.
      }

      // _file.type === FileType.annotationImage
      // _file.type === FileType.annotationZIP
      const csvFileIndex = files.findIndex(
        x => x.type === FileType.annotationCSV,
      );
      if (csvFileIndex < 0) {
        // There is no csv file in the zip file.
        return files.map(
          file =>
            new AnnotationModel({
              project: _project,
              studyArea: _cameraLocation.studyArea,
              cameraLocation: _cameraLocation,
              uploadSession: _uploadSession,
              file,
              filename: file.originalFilename,
              time: file.exif.dateTime,
            }),
        );
      }

      // _file.type === FileType.annotationZIP with csv
      _isZipWithCsv = true;
      const [csvFile] = files.splice(csvFileIndex, 1);
      const imageAnnotations = files.map(
        file =>
          new AnnotationModel({
            project: _project,
            studyArea: _cameraLocation.studyArea,
            cameraLocation: _cameraLocation,
            uploadSession: _uploadSession,
            file,
            filename: file.originalFilename,
            time: file.exif.dateTime,
          }),
      );
      return csvParseAsync(csvFile.content)
        .then(csvObject => {
          const limit = pLimit(5); // Save 5 new species in the same time.
          const result = utils.convertCsvToAnnotations({
            project: _project,
            studyAreas: _allStudyAreas,
            dataFields: _project.dataFields,
            cameraLocations: _allCameraLocations,
            uploadSession: _uploadSession,
            species: _allSpecies,
            csvObject,
          });
          // Validate annotations
          if (imageAnnotations.length !== result.annotations.length) {
            _uploadSession.errorType =
              UploadSessionErrorType.inconsistentQuantity;
            throw new Error(
              'The quantity of images and the csv file are not equal.',
            );
          }
          const csvAnnotations = [];
          imageAnnotations.forEach(imageAnnotation => {
            const csvAnnotation = result.annotations.find(
              x =>
                x.filename === imageAnnotation.filename &&
                x.time.getTime() === imageAnnotation.time.getTime(),
            );
            if (!csvAnnotation) {
              _uploadSession.errorType =
                UploadSessionErrorType.imagesAndCsvNotMatch;
              throw new Error('Images and csv file are not match.');
            }
            csvAnnotation.file = imageAnnotation.file;
            csvAnnotations.push(csvAnnotation);
          });
          // Save new species.
          const tasks = result.newSpecies.map(x => limit(() => x.save()));
          tasks.unshift(csvAnnotations);
          return Promise.all(tasks);
        })
        .then(([annotations]) => annotations);
    })
    .then(annotations => {
      /*
      - Find the duplicate annotation.
        使用樣區、相機位置、檔名、時間檢查是否已存在 annotation，存在的話需要替換 annotation.file。
      @param annotations {Promise<[{AnnotationModel}]>} Not saved.
      @returns {Promise<[{AnnotationModel}, {AnnotationModel}]>}
        (new annotations, duplicate annotations)
       */
      const statements = annotations.map(annotation => ({
        $and: [
          { state: AnnotationState.active },
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
      @param annotations {Array<AnnotationModel>} Not saved.
      @param duplicateAnnotations {Array<AnnotationModel>} From database.
      @returns {Promise<[AnnotationModel]>}
       */
      const tasks = [];

      if (_file.type === FileType.annotationImage) {
        annotations.forEach(annotation => {
          const duplicateAnnotation = duplicateAnnotations.find(
            x =>
              `${x.cameraLocation._id}` ===
                `${annotation.cameraLocation._id}` &&
              x.filename === annotation.filename &&
              x.time.getTime() === annotation.time.getTime(),
          );
          if (duplicateAnnotation) {
            // The user upload images so we should replace with a new file.
            duplicateAnnotation.file = annotation.file;
            tasks.push(duplicateAnnotation.saveAndAddRevision(_user));
          } else {
            annotation.state = AnnotationState.active;
            tasks.push(annotation.saveAndAddRevision(_user));
          }
        });
        _uploadSession.state = UploadSessionState.success;
      } else if (_file.type === FileType.annotationZIP) {
        if (_isZipWithCsv) {
          // This zip file include a csv file.
          if (duplicateAnnotations.length) {
            // The user will chosen overwrite or not.
            annotations.forEach(annotation => {
              annotation.state = AnnotationState.waitForReview;
              tasks.push(annotation.save());
            });
            _uploadSession.state = UploadSessionState.waitForReview;
          } else {
            annotations.forEach(annotation => {
              annotation.state = AnnotationState.active;
              tasks.push(annotation.saveAndAddRevision(_user));
            });
            _uploadSession.state = UploadSessionState.success;
          }
        } else {
          // Just images are in this zip file.
          annotations.forEach(annotation => {
            const duplicateAnnotation = duplicateAnnotations.find(
              x =>
                `${x.cameraLocation._id}` ===
                  `${annotation.cameraLocation._id}` &&
                x.filename === annotation.filename &&
                x.time.getTime() === annotation.time.getTime(),
            );
            if (duplicateAnnotation) {
              // The user upload images so we should replace with a new file.
              duplicateAnnotation.file = annotation.file;
              tasks.push(duplicateAnnotation.saveAndAddRevision(_user));
            } else {
              annotation.state = AnnotationState.active;
              tasks.push(annotation.saveAndAddRevision(_user));
            }
          });
          _uploadSession.state = UploadSessionState.success;
        }
      } else if (_file.type === FileType.annotationCSV) {
        if (duplicateAnnotations.length) {
          // The user will chosen overwrite or not.
          annotations.forEach(annotation => {
            annotation.state = AnnotationState.waitForReview;
            tasks.push(annotation.save());
          });
          _uploadSession.state = UploadSessionState.waitForReview;
        } else {
          annotations.forEach(annotation => {
            annotation.state = AnnotationState.active;
            tasks.push(annotation.saveAndAddRevision(_user));
          });
          _uploadSession.state = UploadSessionState.success;
        }
      }
      return Promise.all(tasks);
    })
    .then(() =>
      /*
      Set the upload session as success and save it.
      @returns {Promise<UploadSessionModel>}
       */
      // todo: send notification when the state is wait for review.
      _uploadSession.save(),
    )
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
