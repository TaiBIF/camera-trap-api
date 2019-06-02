const errors = require('../../errors');
const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');

// speciesTimeSeriesByCameraLocationId
module.exports = async function(projectId, studyAreaId, year) {
  if (!year) {
    throw new errors.Http400();
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
