const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const ImageType = require('../const/image-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'AnnotationModel',
  utils.generateSchema(
    {
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        required: true,
        index: {
          name: 'Project',
        },
      },
      studyArea: {
        // 樣區
        type: Schema.ObjectId,
        ref: 'StudyAreaModel',
        required: true,
        index: {
          name: 'StudyArea',
        },
      },
      cameraLocation: {
        // 相機
        type: Schema.ObjectId,
        ref: 'CameraLocationModel',
        required: true,
        index: {
          name: 'CameraLocation',
        },
      },
      filename: {
        // 檔名（顯示於資料編輯界面，內容來自 csv 匯入）
        type: String,
        required: true,
      },
      imageFileName: {
        // s3 filename
        type: String,
      },
      time: {
        // 時間
        type: Date,
        required: true,
        index: {
          name: 'Time',
        },
      },
      species: {
        // 物種
        type: Schema.ObjectId,
        ref: 'SpeciesModel',
        index: {
          name: 'Species',
        },
      },
      customFields: [
        // 儲存非系統預設欄位的資料
        // 將系統預設欄位儲於上層物件是為了方便搜尋
        {
          _id: false,
          dataField: {
            type: Schema.ObjectId,
            ref: 'DataFieldModel',
            required: true,
          },
          value: {
            time: {
              type: Date,
            },
            text: {
              type: String,
            },
            selectId: {
              type: Schema.ObjectId,
            },
          },
        },
      ],
      rawData: [
        // The original data from .csv.
        {
          _id: false,
          key: {
            type: String,
            required: true,
          },
          value: {
            type: String,
          },
        },
      ],
    },
    {
      collection: 'Annotations',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    studyArea: (() => {
      if (typeof this.studyArea === 'string') {
        return this.studyArea;
      }
      const result = {
        'zh-TW': this.studyArea.title['zh-TW'],
      };
      if (this.studyArea.parent) {
        result['zh-TW'] = [
          this.studyArea.parent.title['zh-TW'],
          result['zh-TW'],
        ].join('-');
      }
      return result;
    })(),
    cameraLocation:
      this.cameraLocation && typeof this.cameraLocation.dump
        ? this.cameraLocation.dump()
        : this.cameraLocation,
    filename: this.filename,
    imageFileName: this.imageFileName,
    imageUrl: utils.getImageUrl(ImageType.annotation, this.imageFileName),
    time: this.time,
    species:
      this.species && typeof this.species.dump === 'function'
        ? this.species.dump()
        : this.species,
    customFields: this.customFields.map(field => ({
      dataFieldId: field.dataField._id || field.dataField,
      value: field.value.selectId || field.value.text || field.value.time,
    })),
  };
};

module.exports = model;
