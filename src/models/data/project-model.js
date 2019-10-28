const mongoose = require('mongoose');
const utils = require('../../common/utils');
const ProjectLicense = require('../const/project-license');
const ProjectRole = require('../const/project-role');
const UserPermission = require('../../models/const/user-permission');
const getRetrieved = require('../static/project/static-getRetrieved');
const getRetrievedByStudyArea = require('../../models/static/project/static-getRetrievedByStudyArea');
const getRetrievedByCamera = require('../../models/static/project/static-getRetrievedByCamera');
const getSpeciesGroup = require('../../models/static/project/static-getSpeciesGroup');
const getStudyAreaSpeciesGroup = require('../../models/static/project/static-getStudyAreaSpeciesGroup');
const speciesTimeSeries = require('../../models/static/project/static-speciesTimeSeries');
const topSpecies = require('../../models/static/project/static-topSpecies');

const { Schema } = mongoose;
utils.connectDatabase();

const schema = utils.generateSchema(
  {
    title: {
      // 計畫名稱
      type: String,
      required: true,
    },
    shortTitle: {
      // 計畫簡稱
      type: String,
      required: true,
    },
    funder: {
      // 委辦單位
      type: String,
    },
    code: {
      // 計畫編號
      type: String,
    },
    principalInvestigator: {
      // 計畫主持人
      type: String,
      required: true,
    },
    startTime: {
      // 計畫時間（開始）
      type: Date,
      required: true,
    },
    endTime: {
      // 計畫時間（結束）
      type: Date,
      required: true,
    },
    areas: [
      // 計畫地區
      {
        type: Schema.ObjectId,
        ref: 'ProjectAreaModel',
        required: true,
      },
    ],
    description: {
      // 計畫摘要
      type: String,
    },
    note: {
      // 備註
      type: String,
    },
    coverImageFile: {
      // 計畫封面圖片
      type: Schema.ObjectId,
      ref: 'FileModel',
    },
    publishTime: {
      // 公開日期
      type: Date,
    },
    interpretiveDataLicense: {
      // 詮釋資料 創用CC授權許可
      type: String,
      enum: [
        ProjectLicense.publicDomain,
        ProjectLicense.attributionOnly,
        ProjectLicense.attributionAndNoncommercial,
      ],
    },
    identificationInformationLicense: {
      // 鑑定資訊 創用CC授權許可
      type: String,
      enum: [ProjectLicense.attributionOnly],
    },
    videoMaterialLicense: {
      // 影像資料 創用CC授權許可
      type: String,
      enum: [
        ProjectLicense.publicDomain,
        ProjectLicense.attributionOnly,
        ProjectLicense.attributionAndNoncommercial,
      ],
    },
    members: [
      // 計畫成員
      {
        _id: false,
        user: {
          type: Schema.ObjectId,
          ref: 'UserModel',
          required: true,
          index: {
            name: 'MembersUser',
          },
        },
        role: {
          type: String,
          required: true,
          enum: ProjectRole.all(),
        },
      },
    ],
    dataFields: [
      // 資料欄位
      {
        type: Schema.ObjectId,
        ref: 'DataFieldModel',
        required: true,
      },
    ],
    dailyTestTime: {
      // 每日測試照片拍攝時間
      // null 或空字串代表關閉此功能。ex: 13:00:00
      // 此欄位僅儲存字串，測試時尋找 csv 中時間欄位為此字串結尾且物種為測試。
      type: String,
    },
    latestAnnotationTime: {
      // 資料最後更新時間
      type: Date,
      index: {
        name: 'LatestAnnotationTime',
      },
    },
    oldestAnnotationTime: {
      // 資料起始年份
      type: Date,
      index: {
        name: 'OldestAnnotationTime',
      },
    },
  },
  {
    collection: 'Projects',
  },
);

const canManageBy = function(currentUser) {
  /*
  Check the user have the permission to manage this project.
  @param currentUser {UserModel}
  @returns {Boolean}
   */
  if (!currentUser || !currentUser._id || !currentUser.permission) {
    return false;
  }

  const member = this.members.find(
    item => `${item.user._id}` === `${currentUser._id}`,
  );

  return (
    currentUser.permission === UserPermission.administrator ||
    (member && member.role === ProjectRole.manager)
  );
};
schema.method('canManageBy', canManageBy);

schema.method('canAccessBy', function(currentUser) {
  /*
  Check the user have the permission to access the project.
  - Read this project.
  - Update annotations of this project.
  @param currentUser {UserModel}
  @returns {Boolean}
   */
  if (!currentUser || !currentUser._id || !currentUser.permission) {
    return false;
  }

  const member = this.members.find(
    item => `${item.user._id}` === `${currentUser._id}`,
  );

  return currentUser.permission === UserPermission.administrator || member;
});

schema.static('getRetrieved', getRetrieved);
schema.static('getRetrievedByStudyArea', getRetrievedByStudyArea);
schema.static('getRetrievedByCamera', getRetrievedByCamera);
schema.static('getSpeciesGroup', getSpeciesGroup);
schema.static('getStudyAreaSpeciesGroup', getStudyAreaSpeciesGroup);
schema.static('speciesTimeSeries', speciesTimeSeries);
schema.static('topSpecies', topSpecies);

//
const model = mongoose.model('ProjectModel', schema);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
    shortTitle: this.shortTitle,
    funder: this.funder,
    code: this.code,
    principalInvestigator: this.principalInvestigator,
    startTime: this.startTime,
    endTime: this.endTime,
    areas: this.areas.map(area =>
      area && typeof area.dump === 'function' ? area.dump() : area,
    ),
    description: this.description,
    note: this.note,
    coverImageFile:
      this.coverImageFile && typeof this.coverImageFile.dump === 'function'
        ? this.coverImageFile.dump()
        : this.coverImageFile,
    publishTime: this.publishTime,
    interpretiveDataLicense: this.interpretiveDataLicense,
    identificationInformationLicense: this.identificationInformationLicense,
    videoMaterialLicense: this.videoMaterialLicense,
    members: this.members.map(member => {
      const result = {
        user: member.user,
        role: member.role,
      };
      if (member.user && typeof member.user.dump === 'function') {
        result.user = member.user.dump();
      }
      return result;
    }),
    dataFields: this.dataFields.map(dataField =>
      dataField && typeof dataField.dump === 'function'
        ? dataField.dump()
        : dataField,
    ),
    dailyTestTime: this.dailyTestTime,
    latestAnnotationTime: this.latestAnnotationTime,
    oldestAnnotationTime: this.oldestAnnotationTime,
  };
};

module.exports = model;
