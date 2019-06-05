const _ = require('lodash');
const mongoose = require('mongoose');

// topSpecies
module.exports = async function(projectId, limit = 5) {
  const AnnotationModel = this.db.model('AnnotationModel');
  const ProjectSpeciesModel = this.db.model('ProjectSpeciesModel');
  const SpeciesModel = this.db.model('SpeciesModel');

  const excludeSpecies = await SpeciesModel.find({
    'title.zh-TW': { $in: ['空拍', '測試', '人', '定時測試', '工作照'] },
  });
  const projectSpecies = await ProjectSpeciesModel.find({
    project: projectId,
    species: { $nin: _.map(excludeSpecies, '_id') },
  });
  const species = await AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        species: { $in: _.map(projectSpecies, 'species') },
      },
    },
    {
      $group: {
        _id: '$species',
        count: { $sum: 1 },
      },
    },
  ]);

  const sortedList = species.sort((a, b) => {
    if (a.count < b.count) return 1;
    if (a.count > b.count) return -1;
    return 0;
  });
  const sortedIds = _.map(_.take(sortedList, limit), '_id');

  return sortedIds;
};
