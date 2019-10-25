const StatisticModel = require('../models/data/statistic-model');

exports.getStatistics = async (req, res) => {
  /*
    GET /api/v1/statistics
  */
  const oldestCameraLocation = await StatisticModel.find()
    .sort('cameraLocation.createTime')
    .limit(1);
  const oldestPicture = await StatisticModel.find()
    .sort('picture.createTime')
    .limit(1);

  const startYear =
    oldestCameraLocation[0].cameraLocation.createTime.getFullYear() <
    oldestPicture[0].picture.createTime.getFullYear()
      ? oldestCameraLocation[0].cameraLocation.createTime.getFullYear()
      : oldestPicture[0].picture.createTime.getFullYear();
  const endYear = new Date().getFullYear();

  // eslint-disable-next-line prefer-const
  let yearArr = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const startDate = new Date(`${year}-01-01 00:00:00`).toLocaleString(
      'zh-TW',
      { timeZone: 'Asia/Taipei' },
    );
    const endDate = new Date(`${year}-12-31 23:59:59`).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
    });

    // eslint-disable-next-line no-await-in-loop
    const totalPicture = await StatisticModel.find({
      'picture.createTime': {
        $gt: startDate,
        $lt: endDate,
      },
    }).countDocuments();
    // eslint-disable-next-line no-await-in-loop
    const totalCameraLocation = await StatisticModel.find({
      'cameraLocation.createTime': {
        $gt: startDate,
        $lt: endDate,
      },
    }).countDocuments();

    yearArr.push({ year, totalPicture, totalCameraLocation });
  }

  const speciesData = await StatisticModel.aggregate([
    {
      $lookup: {
        from: 'Species',
        localField: 'species',
        foreignField: '_id',
        as: 'species',
      },
    },
    {
      $group: {
        _id: '$species',
        picture: { $push: '$picture.fileName' },
        cameraLocation: { $push: '$cameraLocation.detail' },
      },
    },
  ]);
  const speciesArr = speciesData.reduce((pre, cur) => {
    if (cur._id.length === 0) return pre;

    const totalLocation = cur.cameraLocation.reduce((preData, curData) => {
      if (preData.indexOf(`${curData}`) === -1)
        return [...preData, `${curData}`];
      return preData;
    }, []).length;

    return [
      ...pre,
      {
        species: cur._id[0]._id,
        name: cur._id[0].title['zh-TW'],
        totalLocation,
        totalPicture: new Set(cur.picture).size,
      },
    ];
  }, []);

  const funderData = await StatisticModel.aggregate([
    {
      $lookup: {
        from: 'Projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project',
      },
    },
    {
      $group: {
        _id: '$project.funder',
        count: { $sum: 1 },
      },
    },
  ]);
  const funderArr = funderData.map(funder => ({
    name: funder._id[0],
    totalData: funder.count,
  }));

  res.json({ year: yearArr, species: speciesArr, funder: funderArr });
};

exports.getStatisticsByCounty = (req, res) => {
  /*
    GET /api/v1/statistics/county/{countyName}
  */
  // req.params.countyName
};
