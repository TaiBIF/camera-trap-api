const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const ProjectArea = require('../const/project-area');
const License = require('../const/license');
const ProjectRol = require('../const/project-role');

const db = utils.getDatabaseConnection();
const model = db.model(
  'ProjectModel',
  utils.generateSchema(
    {
      title: {
        // 計畫名稱
        type: String,
        required: true,
      },
      shortTitle: {
        // 計畫簡稱
        type: String,
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
      },
      startTime: {
        // 計畫時間（開始）
        type: Date,
      },
      endTime: {
        // 計畫時間（結束）
        type: Date,
      },
      areas: [
        // 計畫地區
        {
          type: String,
          enum: ProjectArea.all(),
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
      coverImageUrl: {
        // 計畫封面網址
        type: String,
      },
      publishTime: {
        // 公開日期
        type: Date,
      },
      interpretiveDataLicense: {
        // 詮釋資料 創用CC授權許可
        type: String,
        enum: [
          License.freeingContent,
          License.attributionAlone,
          License.attributionAndNoncommercial,
        ],
      },
      identificationInformationLicense: {
        // 鑑定資訊 創用CC授權許可
        type: String,
        enum: [License.attributionAlone],
      },
      videoMaterialLicense: {
        // 影像資料 創用CC授權許可
        type: String,
        enum: [
          License.freeingContent,
          License.attributionAlone,
          License.attributionAndNoncommercial,
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
            enum: ProjectRol.all(),
          },
        },
      ],
    },
    {
      collection: 'Projects',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
  };
};

module.exports = model;
