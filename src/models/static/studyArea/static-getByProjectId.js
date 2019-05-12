// const mongoose = require('mongoose');
const StudyAreaState = require('../../../models/const/study-area-state');

// getByProjectId
module.exports = async function(projectId) {
  const StudyAreaModel = this.db.model('StudyAreaModel');

  return StudyAreaModel.where({ state: StudyAreaState.active })
    .where({ project: projectId })
    .sort('title.zh-TW');
};
