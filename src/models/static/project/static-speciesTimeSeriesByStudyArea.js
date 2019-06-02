const errors = require('../../errors');
const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');

// speciesTimeSeriesByStudyAreaId
module.exports = async function(projectId, studyAreaId, year) {
  if (!year) {
    throw new errors.Http400('Missing parameter: year.');
  }
  const ProjectModel = this.db.model('ProjectModel');

  //
  const r = await ProjectModel.speciesTimeSeries(
    projectId,
    'studyArea',
    studyAreaId,
    year,
  );

  return reformatSpeciesTimeSeries(r, 'studyArea');
};
