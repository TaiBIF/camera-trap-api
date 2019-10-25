// const StatisticModel = require('../models/data/statistic-model');

const ProjectModel = require('../models/data/project-model');
const StudyAreaModel = require('../models/data/study-area-model');
const CameraLocationModel = require('../models/data/camera-location-model');
const StatisticModel = require('../models/data/statistic-model');
const AnnotationModel = require('../models/data/annotation-model');
const ProjectTripModel = require('../models/data/project-trip-model');
const StatisticCameraModel = require('../models/data/statistic-camera-model');

const StudyAreaState = require('../models/const/study-area-state');
const AnnotationState = require('../models/const/annotation-state');

const countCounty = [
  '基隆市',
  '台北市',
  '新北市',
  '桃園縣',
  '新竹縣',
  '苗栗縣',
  '台中市',
  '南投縣',
  '彰化縣',
  '雲林縣',
  '嘉義縣',
  '嘉義市',
  '台南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
];

const countData = async (job, done) => {
  // 清除舊資料
  await StatisticModel.collection.drop();
  await StatisticModel.createIndexes();

  const projectData = await ProjectModel.find();

  projectData.map(async project => {
    // 專案下的樣區
    const studyAreaData = await StudyAreaModel.where({
      project: project._id,
      state: StudyAreaState.active,
    });

    studyAreaData.map(async studyArea => {
      let county = '';
      countCounty.some(c => {
        if (studyArea.title['zh-TW'].indexOf(c.substr(0, 2)) > -1) {
          county = c;
          return true;
        }
        return false;
      });

      if (county !== '') {
        // 樣區下的相機位置
        const cameraLocationData = await CameraLocationModel.where({
          studyArea: studyArea._id,
        });

        cameraLocationData.map(async cameraLocation => {
          // 依相機位置取出資料
          const annotationData = await AnnotationModel.where({
            project: project._id,
            studyArea: studyArea._id,
            cameraLocation: cameraLocation._id,
            state: AnnotationState.active,
          });

          annotationData.forEach(async annotation => {
            const statistic = new StatisticModel({
              project,
              funder: project.funder,
              county,
              studyArea,
              cameraLocation: {
                detail: cameraLocation,
                createTime: cameraLocation.createTime,
              },
              species: annotation.species,
              picture: {
                fileName: annotation.filename,
                size: annotation.filename ? 1 : 0,
                createTime: annotation.createTime,
              },
            });

            await statistic.save();
          });
        });
      }
    });
  });
};

const countCamera = async () => {
  // 清除舊資料
  await StatisticCameraModel.collection.drop();
  await StatisticCameraModel.createIndexes();

  const projectTripData = await ProjectTripModel.find({});
  projectTripData.forEach(projectTrip => {
    if (projectTrip.studyAreas && projectTrip.studyAreas.length > 0) {
      projectTrip.studyAreas.forEach(async studyArea => {
        const studyAreaData = await StudyAreaModel.findById(
          studyArea.studyArea,
        );
        let county = '';
        countCounty.some(c => {
          if (studyAreaData.title['zh-TW'].indexOf(c.substr(0, 2)) > -1) {
            county = c;
            return true;
          }
          return false;
        });
        if (
          county !== '' &&
          studyArea.cameraLocations &&
          studyArea.cameraLocations.length > 0
        ) {
          studyArea.cameraLocations.forEach(cameraLocation => {
            if (
              cameraLocation.projectCameras &&
              cameraLocation.projectCameras.length > 0
            ) {
              cameraLocation.projectCameras.forEach(async projectCamera => {
                // 計算工時
                let workHour = 0;
                if (
                  projectCamera.startActiveDate &&
                  projectCamera.endActiveDate
                ) {
                  const startDate = new Date(projectCamera.startActiveDate);
                  const endDate = new Date(projectCamera.endActiveDate);

                  workHour = parseInt(endDate - startDate, 10) / 1000 / 60 / 60;
                }

                const statisticCamera = new StatisticCameraModel({
                  county,
                  trip: projectTrip._id,
                  camera: {
                    _id: projectCamera._id,
                    sn: projectCamera.cameraSn,
                    workHour,
                  },
                });

                await statisticCamera.save();
              });
            }
          });
        }
      });
    }
  });
};

countData();
countCamera();

module.exports = countData;
