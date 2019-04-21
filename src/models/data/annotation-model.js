const mongoose = require('mongoose');
const utils = require('../../common/utils');
const AnnotationFailureType = require('../const/annotation-failure-type');
const AnnotationState = require('../const/annotation-state');
const AnnotationRevisionModel = require('./annotation-revision-model');

const { Schema } = mongoose;
utils.connectDatabase();
const model = mongoose.model(
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
      uploadSession: {
        type: Schema.ObjectId,
        ref: 'UploadSessionModel',
        required: true,
        index: {
          name: 'UploadSession',
        },
      },
      state: {
        type: String,
        required: true,
        enum: AnnotationState.all(),
        index: {
          name: 'State',
        },
      },
      failures: [
        // 錯誤提示
        {
          type: String,
          required: true,
          enum: AnnotationFailureType.all(),
          index: {
            name: 'Failures',
          },
        },
      ],
      filename: {
        // 檔名（顯示於資料編輯界面，內容來自 csv 匯入）
        type: String,
        required: true,
      },
      file: {
        // S3 file.
        // 匯入 .csv 時不一定要有圖片，所以 annotation 有可能會只有檔名但沒檔案
        type: Schema.ObjectId,
        ref: 'FileModel',
        index: {
          name: 'File',
        },
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
      fields: [
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
          type: String,
        },
      ],
    },
    {
      collection: 'Annotations',
    },
  ),
);

model.prototype.saveAndAddRevision = function(user) {
  /*
  Save the annotation and create a new revision.
  @param user {UserModel}
  @returns {Promise<AnnotationModel>}
   */
  let revisionQuery;
  if (this._id) {
    revisionQuery = AnnotationRevisionModel.where({
      annotation: this._id,
    }).where({ isCurrent: true });
  }
  return Promise.all([this.save(), revisionQuery])
    .then(([annotation, oldRevisions]) => {
      const tasks = oldRevisions.map(revision => {
        revision.isCurrency = false;
        return revision.save();
      });
      const revision = new AnnotationRevisionModel({
        annotation,
        user,
        studyArea: annotation.studyArea,
        cameraLocation: annotation.cameraLocation,
        filename: annotation.filename,
        file: annotation.file,
        time: annotation.time,
        species: annotation.species,
        fields: annotation.fields,
      });
      tasks.unshift(annotation);
      tasks.push(revision.save());
      return Promise.all(tasks);
    })
    .then(([annotation]) => annotation);
};

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    studyArea:
      this.studyArea && typeof this.studyArea.dump === 'function'
        ? this.studyArea.dump()
        : this.studyArea,
    cameraLocation:
      this.cameraLocation && typeof this.cameraLocation.dump === 'function'
        ? this.cameraLocation.dump()
        : this.cameraLocation,
    failures: this.failures,
    filename: this.filename,
    file:
      this.file && typeof this.file.dump === 'function'
        ? this.file.dump()
        : this.file,
    time: this.time,
    species:
      this.species && typeof this.species.dump === 'function'
        ? this.species.dump()
        : this.species,
    fields: this.fields.map(field => ({
      dataField:
        field.dataField && typeof field.dataField.dump === 'function'
          ? field.dataField.dump()
          : field.dataField,
      value: field.value.selectId || field.value.text || field.value.time,
    })),
  };
};

module.exports = model;
