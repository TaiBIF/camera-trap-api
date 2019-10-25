const StatisticModel = require('../models/data/statistic-model');
const StatisticCameraModel = require('../models/data/statistic-camera-model');

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
    const totalPicture = new Set(
      // eslint-disable-next-line no-await-in-loop
      (await StatisticModel.find(
        {
          'picture.createTime': {
            $gt: startDate,
            $lt: endDate,
          },
        },
        'picture',
      )).map(({ picture }) => picture.fileName),
    ).size;
    // eslint-disable-next-line no-await-in-loop
    const totalCameraLocation = new Set(
      // eslint-disable-next-line no-await-in-loop
      (await StatisticModel.find(
        {
          'cameraLocation.createTime': {
            $gt: startDate,
            $lt: endDate,
          },
        },
        'cameraLocation',
      )).map(({ cameraLocation }) => `${cameraLocation.detail}`),
    ).size;

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
        count: { $sum: '$picture.size' },
      },
    },
  ]);
  const funderArr = funderData.map(funder => ({
    name: funder._id[0],
    totalData: funder.count,
  }));

  res.json({ year: yearArr, species: speciesArr, funder: funderArr });
};

exports.getStatisticsByCounty = async (req, res) => {
  /*
    GET /api/v1/statistics/county/{countyName}
  */
  const projectTotal = (await StatisticModel.aggregate([
    { $match: { county: req.params.countyName } },
    {
      $group: {
        _id: '$project',
      },
    },
  ])).length;

  const cameraLocationTotal = (await StatisticModel.aggregate([
    { $match: { county: req.params.countyName } },
    {
      $group: {
        _id: '$cameraLocation.detail',
      },
    },
  ])).length;

  const identifiedSpeciesData = await StatisticModel.aggregate([
    { $match: { county: req.params.countyName } },
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
        _id: '$species._id',
        count: { $sum: 1 },
        name: { $push: '$species.title' },
      },
    },
  ]);
  const dataTotal = await StatisticModel.find({
    county: req.params.countyName,
  }).countDocuments();
  let identifiedSpeciesTotal = 0;
  const identifiedSpeciesItems = identifiedSpeciesData.reduce(
    (pre, identifiedSpecies) => {
      if (identifiedSpecies._id[0]) {
        identifiedSpeciesTotal += identifiedSpecies.count;
        return [
          ...pre,
          {
            species: identifiedSpecies._id[0],
            name: identifiedSpecies.name[0][0],
          },
        ];
      }
      return pre;
    },
    [],
  );

  const pictureTotal = (await StatisticModel.aggregate([
    { $match: { county: req.params.countyName } },
    {
      $group: {
        _id: '$picture.fileName',
      },
    },
  ])).length;

  const cameraTotalWorkHourCount = (await StatisticCameraModel.aggregate([
    { $match: { county: req.params.countyName } },
    {
      $group: {
        _id: '$county',
        count: { $sum: '$camera.workHour' },
      },
    },
  ]))[0];
  const cameraTotalWorkHour = cameraTotalWorkHourCount
    ? cameraTotalWorkHourCount.count
    : 0;

  const statisticData = await StatisticModel.aggregate([
    { $match: { county: req.params.countyName } },
    {
      $lookup: {
        from: 'StudyAreas',
        localField: 'studyArea',
        foreignField: '_id',
        as: 'studyArea',
      },
    },
    {
      $lookup: {
        from: 'CameraLocations',
        localField: 'cameraLocation.detail',
        foreignField: '_id',
        as: 'cameraLocation.detail',
      },
    },
    {
      $group: {
        _id: '$studyArea._id',
        studyAreaCount: { $sum: 1 },
        studyAreaTitle: { $push: '$studyArea.title' },
        cameraLocation: { $push: '$cameraLocation.detail' },
      },
    },
  ]);

  const studyAreaItems = statisticData.map(statistic => {
    const cameraLocation = statistic.cameraLocation.reduce((pre, cur) => {
      const curCameraLocation = cur[0];
      if (Object.keys(pre).indexOf(curCameraLocation.name) === -1)
        return {
          ...pre,
          [curCameraLocation.name]: {
            cameraLocation: curCameraLocation._id,
            name: curCameraLocation.name,
            settingTime: curCameraLocation.settingTime,
            latitude: curCameraLocation.latitude,
            longitude: curCameraLocation.longitude,
            altitude: curCameraLocation.altitude,
            landCoverType: curCameraLocation.landCoverType,
            vegetation: curCameraLocation.vegetation,
            data: {
              total: 1,
            },
          },
        };

      const addDataTotal = pre[curCameraLocation.name];
      addDataTotal.data.total += 1;
      return {
        ...pre,
        [curCameraLocation.name]: addDataTotal,
      };
    }, {});

    return {
      studyArea: statistic._id[0],
      title: statistic.studyAreaTitle[0][0],
      cameraLocation: {
        total: Object.values(cameraLocation).length,
        items: Object.values(cameraLocation),
      },
      data: {
        total: statistic.studyAreaCount,
      },
    };
  });

  res.json({
    title: { 'zh-TW': req.params.countyName },
    project: { total: projectTotal },
    cameraLocation: { total: cameraLocationTotal },
    identifiedSpecies: {
      percentage: (identifiedSpeciesTotal / dataTotal) * 100 || 0,
      items: identifiedSpeciesItems,
    },
    picture: { total: pictureTotal },
    camera: { totalWorkHour: cameraTotalWorkHour },
    studyArea: {
      items: studyAreaItems,
    },
  });
};
