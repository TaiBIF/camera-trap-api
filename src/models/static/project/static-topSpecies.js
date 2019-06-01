const _ = require('lodash');
const mongoose = require('mongoose');

// speciesTimeSeriesByCameraLocationId
module.exports = async function(projectId, limit = 5) {
  const AnnotationModel = this.db.model('AnnotationModel');

  const species = await AnnotationModel.aggregate([
    {
      // TODO 物種只計算計畫中預設物種清單，去除諸如「空拍」、「測試」、「人」、「定時測試」、「工作照」等
      $match: {
        project: mongoose.Types.ObjectId(projectId),
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
