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
      site: {
        // 樣區
        type: Schema.ObjectId,
        ref: 'ProjectSiteModel',
        required: true,
        index: {
          name: 'Site',
        },
      },
      camera: {
        // 相機
        type: Schema.ObjectId,
        ref: 'ProjectCameraModel',
        required: true,
        index: {
          name: 'Camera',
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
        ref: 'ProjectSpeciesModel',
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
    site: (() => {
      if (typeof this.site === 'string') {
        return this.site;
      }
      const result = {
        'zh-TW': this.site.title['zh-TW'],
      };
      if (this.site.parent) {
        result['zh-TW'] = [
          this.site.parent.title['zh-TW'],
          result['zh-TW'],
        ].join('-');
      }
      return result;
    })(),
    camera: this.camera && this.camera.name ? this.camera.name : this.camera,
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
