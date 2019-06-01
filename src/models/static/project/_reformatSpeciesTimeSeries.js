const _ = require('lodash');

// input.
// [
//   {
//     "month": 12,
//     "year": 2015,
//     "species": "鼬獾",
//     "speciesId": "5cd661e332a98b60839c6cb2",
//     "numberOfRecords": 178,
//     "studyArea": "羅東處",
//     "studyAreaId": "5ceb7925caaeca25bf2d55f1"
//   }
// ]
module.exports = (dataSet, keyName = 'studyArea') => {
  const { year } = dataSet[0];

  const empty12m = _.times(12, key => ({
    year,
    month: key + 1,
    metrics: _.stubArray(),
  }));

  const formatMetrics = metrics =>
    _.chain(metrics)
      .groupBy('month')
      .reduce((result, value, month) => {
        month = Number.parseInt(month, 10);
        value = _.map(value, row => ({
          species: row.species,
          speciesId: row.speciesId,
          numberOfRecords: row.numberOfRecords,
        }));
        const target = result[month - 1];
        target.metrics = target.metrics.concat(value);
        return result;
      }, empty12m);

  const newArray = _.chain(dataSet)
    .groupBy(`${keyName}Id`)
    .reduce((result, value, key) => {
      result.push({
        [`${keyName}Id`]: key,
        [keyName]: value[0][keyName],
        metrics: formatMetrics(value),
      });
      return result;
    }, []);

  return newArray;
};
