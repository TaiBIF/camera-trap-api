const mongoose = require('mongoose');
const utils = require('../../common/utils');
const NotificationType = require('../const/notification-type');

const { Schema } = mongoose;
utils.connectDatabase();
const model = mongoose.model(
  'NotificationModel',
  utils.generateSchema(
    {
      user: {
        // recipient
        type: Schema.ObjectId,
        ref: 'UserModel',
        required: true,
        index: {
          name: 'User',
        },
      },
      type: {
        type: String,
        required: true,
        enum: NotificationType.all(),
      },
      isRead: {
        type: Boolean,
        default: false,
      },
      dataField: {
        type: Schema.ObjectId,
        ref: 'DataFieldModel',
      },
      uploadSession: {
        type: Schema.ObjectId,
        ref: 'UploadSessionModel',
      },
      issue: {
        type: Schema.ObjectId,
        ref: 'IssueModel',
      },
      expiredTime: {
        // 超過時間後不顯示，用於系統公告
        type: Date,
        index: {
          name: 'ExpiredTime',
        },
      },
    },
    {
      collection: 'Notifications',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    isRead: this.isRead,
    dataField:
      this.dataField && typeof this.dataField.dump === 'function'
        ? this.dataField.dump()
        : this.dataField,
    uploadSession:
      this.uploadSession && typeof this.uploadSession.sump === 'function'
        ? this.uploadSession.dump()
        : this.uploadSession,
    issue:
      this.issue && typeof typeof this.issue.dump === 'function'
        ? this.issue.dump()
        : this.issue,
    createTime: this.createTime,
  };
};

module.exports = model;
