const _ = require('lodash');

// reformatRetrieved
module.exports = (dataSet, keyName) => {
  dataSet = _.groupBy(dataSet, `_id.${keyName}`);
  dataSet = _.mapValues(dataSet, (singleDataSetArray, key) =>
    singleDataSetArray.reduce((previous, row) => {
      previous[row._id.month - 1] = {
        month: row._id.month,
        dataCount: row.dataCount,
        fileCount: row.fileCount,
        speciesCount: row.speciesCount,
        failures: row.failures,
        lastData: row.lastData,
      };
      return previous;
    }, new Array(12)),
  );

  const newArray = [];
  _.forIn(dataSet, (value, key) => {
    newArray.push({
      [keyName]: key,
      data: value,
    });
  });

  return newArray;
};
