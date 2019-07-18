const SpeciesModel = require('../models/data/species-model');
// const ProjectSpeciesModel = require('../models/data/project-species-model');
const SpeciesSynonyms = require('../models/const/species-synonyms');

exports.findSynonymSpecies = speciesIds =>
  SpeciesModel.where({
    _id: { $in: speciesIds },
  }).then(speciesList => {
    let foundSynonyms = [];
    speciesList.forEach(species => {
      Object.entries(SpeciesSynonyms).find(item => {
        let synonymList = [item[0]];
        if (item[1] !== '') {
          synonymList = synonymList.concat(item[1].split(';'));
        }
        if (synonymList.indexOf(species.title['zh-TW']) >= 0) {
          foundSynonyms = synonymList;
          return true;
        }
        return false;
      });
    });
    return SpeciesModel.where({
      'title.zh-TW': { $in: foundSynonyms },
    }).then(mappedSpeciesList => {
      const mappedSpeciesIds = mappedSpeciesList.map(species => species._id);
      return mappedSpeciesIds;
    });
  });
