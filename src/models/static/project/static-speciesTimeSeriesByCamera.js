const errors = require('../../errors');
const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');

// speciesTimeSeriesByCameraLocationId
module.exports = async function(projectId, cameraLocationId, year) {
  if (!year) {
    throw new errors.Http400('Missing parameter: year.');
  }
  const ProjectModel = this.db.model('ProjectModel');

  //
  const r = await ProjectModel.speciesTimeSeries(
    projectId,
    'cameraLocation',
    cameraLocationId,
    year,
  );

  return reformatSpeciesTimeSeries(r, 'cameraLocation');
};
