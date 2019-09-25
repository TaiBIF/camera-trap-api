const fs = require('fs');
const util = require('util');
const path = require('path');
const config = require('config');
const csvParse = require('csv-parse');
const extract = require('extract-zip');
const pLimit = require('p-limit');
const tmp = require('tmp');
const Promise = require('bluebird');
const utils = require('../../common/utils');
const errors = require('../../models/errors');
const MediaWorkerData = require('../../models/dto/media-worker-data');
const UserModel = require('../../models/data/user-model');
const FileModel = require('../../models/data/file-model');
const FileType = require('../../models/const/file-type');
const FileExtensionName = require('../../models/const/file-extension-name');
require('../../models/data/exchangeable-image-file-model'); // for populate
const UploadSessionModel = require('../../models/data/upload-session-model');
const UploadSessionState = require('../../models/const/upload-session-state');
const UploadSessionErrorType = require('../../models/const/upload-session-error-type');
const ProjectModel = require('../../models/data/project-model');
const ProjectSpeciesModel = require('../../models/data/project-species-model');
require('../../models/data/data-field-model'); // for populate
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const SpeciesModel = require('../../models/data/species-model');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const NotificationModel = require('../../models/data/notification-model');
const NotificationType = require('../../models/const/notification-type');
const logger = require('../../logger');

module.exports = (job, done) => {
  const workerData = new MediaWorkerData(job.data);
  let _user;
  let _project;
  let _file;
  let _uploadSession;
  let _cameraLocation;
  let _allStudyAreas; // only for zip or csv type.
  let _allCameraLocations; // only for zip or csv type.
  let _allProjectSpecies; // only for zip or csv type.
  let _allSpecies; // only for zip or csv type.
  let _isZipWithCsv; // The user upload a zip file include images and a csv.

  logger.info(`media-worker job[${job.id}] start.`);
  logger.info(JSON.stringify(job.data, null, 2));

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

    // Fetch all project species of the project for csv data.
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return ProjectSpeciesModel.where({ project: workerData.projectId });
      }
    })(),

    // Fetch all species for csv data.
    (() => {
      if (
        [FileType.annotationCSV, FileType.annotationZIP].indexOf(
          workerData.fileType,
        ) >= 0
      ) {
        return SpeciesModel.where();
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
        allProjectSpecies,
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
        _allProjectSpecies = allProjectSpecies;
        _allSpecies = allSpecies;

        // Check user, project, file, uploadSession isn't null.
        if (!user) {
          throw new errors.Http400('[media-worker.js: 152] no user data.');
        }
        if (!project) {
          throw new errors.Http400('[media-worker.js: 155] no project data.');
        }
        if (!file) {
          throw new errors.Http400('[media-worker.js: 158] no file data.');
        }
        if (!uploadSession) {
          throw new errors.Http400(
            '[media-worker.js: 161] no upload session data.',
          );
        }
        // Check the user is a member of the project.
        if (!project.canAccessBy(user)) {
          _uploadSession.errorType = UploadSessionErrorType.permissionDenied;
          throw new errors.Http403();
        }
        // Do validations for each the file type.
        if (!cameraLocation) {
          throw new errors.Http404('Camera location is not found.');
        }
        if (
          !cameraLocation.studyArea ||
          cameraLocation.studyArea.state !== StudyAreaState.active
        ) {
          throw new errors.Http404('Study area is not found.');
        }

        console.log('---finish validation-----');
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

      console.log('---start handle file-----');
      console.log(`file type: ${_file.type}`);

      // _file.type === FileType.annotationZIP
      const tempFile = tmp.fileSync();
      const tempDir = tmp.dirSync();
      console.log(`temp file: ${tempDir.name}, temp dir: ${tempFile.name}`);
      return new Promise((resolve, reject) => {
        /*
        - Download the zip file from S3.
        - Unzip the zip file to the local folder.
        @returns {Promise<>}
         */
        const s3 = utils.getS3();
        const file = fs.createWriteStream(tempFile.name);

        file.on('close', () => {
          console.log('---finish get file from s3-----');
          extract(
            tempFile.name,
            {
              dir: tempDir.name,
              onEntry: (entry, zipfile) => {
                zipfile.once('end', () => {
                  fs.utimesSync(
                    path.join(tempDir.name, entry.fileName),
                    entry.getLastModDate(),
                    entry.getLastModDate(),
                  );
                });
              },
            },
            error => {
              console.log('---extract files down-----');
              if (error) {
                return reject(error);
              }
              resolve();
            },
          );
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
          console.log(tempDir.name);
          return new Promise((resolve, reject) => {
            const finalResults = [];
            Promise.resolve(fs.readdirSync(tempDir.name))
              .map(
                filename => {
                  console.log('-----start iterate folder-----');
                  const file = new FileModel({
                    type: FileType.annotationImage,
                    project: _project,
                    user: _user,
                    originalFilename: filename,
                  });
                  const fileExtensionName = file.getExtensionName();
                  console.log(filename);
                  console.log(fileExtensionName);
                  if (
                    FileExtensionName.annotationImage.indexOf(
                      fileExtensionName,
                    ) < 0 &&
                    FileExtensionName.annotationVideo.indexOf(
                      fileExtensionName,
                    ) < 0 &&
                    FileExtensionName.annotationCsv.indexOf(fileExtensionName) <
                      0
                  ) {
                    // This is not allow files.
                    fs.unlinkSync(path.join(tempDir.name, filename));
                    return;
                  }
                  let source = path.join(tempDir.name, filename);

                  // Fix file.type
                  if (
                    FileExtensionName.annotationCsv.indexOf(
                      fileExtensionName,
                    ) >= 0
                  ) {
                    // The binary content will be used for convert to annotations.
                    source = fs.readFileSync(source);
                    file.content = source;
                    file.type = FileType.annotationCSV;
                  } else if (
                    FileExtensionName.annotationVideo.indexOf(
                      fileExtensionName,
                    ) >= 0
                  ) {
                    file.type = FileType.annotationVideo;
                  }

                  finalResults.push(file);
                  return file.saveWithContent(source).then(() => {
                    console.log(`----------save file success ${filename}`);
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
                },
                { concurrency: 8 },
              )
              .then(() => resolve(finalResults))
              .catch(() => reject(new Error('parallels fails')));
          });
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
        console.error(
          `${config.s3.folders.annotationCSVs}/${_file.getFilename()}`,
        );
        return utils
          .getS3Object(
            `${config.s3.folders.annotationCSVs}/${_file.getFilename()}`,
          )
          .then(data => {
            console.error(data.Body);
            return csvParseAsync(data.Body, { bom: true });
          })
          .then(csvObject => {
            const limit = pLimit(5); // Save max 5 new species at once.
            const result = utils.convertCsvToAnnotations({
              project: _project,
              studyAreas: _allStudyAreas,
              dataFields: _project.dataFields,
              cameraLocations: _allCameraLocations,
              uploadSession: _uploadSession,
              projectSpecies: _allProjectSpecies,
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

      console.error(`find index`);
      // _file.type === FileType.annotationImage
      // _file.type === FileType.annotationVideo
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
      console.error(`add annotation`);
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
      return csvParseAsync(csvFile.content, { bom: true })
        .then(csvObject => {
          const limit = pLimit(5); // Save 5 new species in the same time.
          const result = utils.convertCsvToAnnotations({
            project: _project,
            studyAreas: _allStudyAreas,
            dataFields: _project.dataFields,
            cameraLocations: _allCameraLocations,
            uploadSession: _uploadSession,
            projectSpecies: _allProjectSpecies,
            species: _allSpecies,
            csvObject,
          });
          const imageAnnotationTable = {};
          imageAnnotations.forEach(imageAnnotation => {
            imageAnnotationTable[imageAnnotation.filename] = imageAnnotation;
          });
          result.annotations.forEach(csvAnnotation => {
            const imageAnnotation =
              imageAnnotationTable[csvAnnotation.filename];
            if (!imageAnnotation) {
              _uploadSession.errorType =
                UploadSessionErrorType.imagesAndCsvNotMatch;
              throw new Error(
                `Images and csv file do not match. Missing: ${
                  csvAnnotation.filename
                }`,
              );
            }
            csvAnnotation.file = imageAnnotation.file;
          });
          // Save new species.
          const tasks = result.newSpecies.map(x => limit(() => x.save()));
          tasks.unshift(result.annotations);
          return Promise.all(tasks);
        })
        .then(([annotations]) => annotations);
    })
    .then(annotations => {
      /*
      - Find the duplicate annotation.
        使用樣區、相機位置、檔名、時間檢查是否已存在 annotation。
        存在的話且使用者是上傳圖片、影片的話需要替換 annotation.file。
        存在的話且使用者是 csv 的話需要替換 annotation.species, .filename, .file, .fields。
      @param annotations {Promise<[{AnnotationModel}]>} Not saved.
      @returns {Promise<[{AnnotationModel}, {AnnotationModel}]>}
        (new annotations, duplicate annotations)
       */
      console.error(`Find the duplicate annotation`);
      const statements = annotations.map(annotation => ({
        state: AnnotationState.active,
        cameraLocation: annotation.cameraLocation._id,
        filename: annotation.filename,
        time: annotation.time,
      }));

      return Promise.all([
        annotations,
        AnnotationModel.where({
          _id: { $in: annotations.map(x => x._id) },
          state: AnnotationState.active,
        }),
        AnnotationModel.find({ $or: statements }),
      ]);
    })
    .then(([annotations, sameIdAnnotations, duplicateAnnotations]) => {
      /*
      - If the duplicate annotation is exists then update the file of the duplicate one.
      - If there is no duplicate annotation then save a new annotation.
      - Set upload session state.
      @param annotations {Array<AnnotationModel>} Not saved.
      @param duplicateAnnotations {Array<AnnotationModel>} From database.
      @returns {Promise<[AnnotationModel]>}
       */
      console.error(`Generate an annotation key`);
      const getKey = annotation =>
        /*
        Generate an annotation key.
        @param annotation {AnnotationModel}
        @returns {String}
         */
        `${annotation.cameraLocation._id}-${
          annotation.filename
        }-${annotation.time.getTime()}`;
      const duplicateAnnotationTable = {}; // {"cameraLocationId-filename-time": {Array<AnnotationModel>}}
      duplicateAnnotations.forEach(x => {
        const items = duplicateAnnotationTable[getKey(x)];
        if (items) {
          items.push(x);
        } else {
          duplicateAnnotationTable[getKey(x)] = [x];
        }
      });
      const sameIdAnnotationTable = {};
      sameIdAnnotations.forEach(x => {
        sameIdAnnotationTable[x.id] = x;
      });
      const tasks = [];

      if (
        [FileType.annotationImage, FileType.annotationVideo].indexOf(
          _file.type,
        ) >= 0
      ) {
        annotations.forEach(annotation => {
          const items = duplicateAnnotationTable[getKey(annotation)];
          if (items) {
            // The user upload images so we should replace with a new file.
            items.forEach(x => {
              x.file = annotation.file;
              tasks.push(x.saveAndAddRevision(_user));
            });
          } else {
            annotation.state = AnnotationState.active;
            tasks.push(annotation.saveAndAddRevision(_user));
          }
        });
        _uploadSession.state = UploadSessionState.success;
      } else if (_file.type === FileType.annotationZIP) {
        if (_isZipWithCsv) {
          // This zip file include a csv file.
          annotations.forEach(annotation => {
            const sameIdAnnotation = sameIdAnnotationTable[annotation.id];
            if (sameIdAnnotation) {
              sameIdAnnotation.failures = annotation.failures;
              sameIdAnnotation.file = annotation.file || sameIdAnnotation.file;
              sameIdAnnotation.species = annotation.species;
              sameIdAnnotation.fields = annotation.fields;
              sameIdAnnotation.rawData = annotation.rawData;
              tasks.push(sameIdAnnotation.saveAndAddRevision(_user));
            } else {
              annotation.state = AnnotationState.active;
              tasks.push(annotation.saveAndAddRevision(_user));
            }
          });
          _uploadSession.state = UploadSessionState.success;
        } else {
          // Just images, videos are in this zip file.
          annotations.forEach(annotation => {
            const items = duplicateAnnotationTable[getKey(annotation)];
            if (items) {
              // The user upload images so we should replace with a new file.
              items.forEach(x => {
                x.file = annotation.file;
                tasks.push(x.saveAndAddRevision(_user));
              });
            } else {
              annotation.state = AnnotationState.active;
              tasks.push(annotation.saveAndAddRevision(_user));
            }
          });
          _uploadSession.state = UploadSessionState.success;
        }
      } else if (_file.type === FileType.annotationCSV) {
        annotations.forEach(annotation => {
          const sameIdAnnotation = sameIdAnnotationTable[annotation.id];
          if (sameIdAnnotation) {
            sameIdAnnotation.failures = annotation.failures;
            sameIdAnnotation.file = annotation.file || sameIdAnnotation.file;
            sameIdAnnotation.species = annotation.species;
            sameIdAnnotation.fields = annotation.fields;
            sameIdAnnotation.rawData = annotation.rawData;
            tasks.push(sameIdAnnotation.saveAndAddRevision(_user));
          } else {
            annotation.state = AnnotationState.active;
            tasks.push(annotation.saveAndAddRevision(_user));
          }
        });
        _uploadSession.state = UploadSessionState.success;
      }
      return Promise.all(tasks);
    })
    .then(() => {
      /*
      - Save upload session.
      @returns {Promise<UploadSessionModel>}
       */
      const notificationTypeTable = {};
      notificationTypeTable[UploadSessionState.success] =
        NotificationType.uploadSuccess;
      notificationTypeTable[UploadSessionState.failure] =
        NotificationType.uploadFailure;
      notificationTypeTable[UploadSessionState.waitForReview] =
        NotificationType.waitForOverwrite;
      const notification = new NotificationModel({
        user: _user,
        type: notificationTypeTable[_uploadSession.state],
        uploadSession: _uploadSession,
      });

      return Promise.all([_uploadSession.save(), notification.save()]);
    })
    .then(() => {
      if (config.isDebug) {
        console.log(`media-worker job[${job.id}] done.`);
      }
      done();
    })
    .catch(error => {
      utils.logError(error, job.data);
      done(error);

      if (_uploadSession) {
        _uploadSession.state = UploadSessionState.failure;
        _uploadSession.errorType =
          _uploadSession.errorType || UploadSessionErrorType.others;
        _uploadSession.save();
      }
      const notification = new NotificationModel({
        user: _user,
        type: NotificationType.uploadFailure,
        uploadSession: _uploadSession,
      });
      notification.save();
    });
};
