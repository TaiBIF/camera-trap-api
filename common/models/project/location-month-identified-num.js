/*
  @todo add last modified timestamp.
  TaiBIF/camera-trap-webapp/issues/16#issuecomment-437429780
 */
module.exports = async ({ data, req, res, db }) => {
  const { fullCameraLocationMd5, year, site, subSite, projectId } = data;

  const toMatch = {
    $and: [
      { 'tokens.species_shortcut': { $ne: '尚未辨識' } },
      { 'tokens.species_shortcut': { $ne: '' } },
    ],
  };

  if (fullCameraLocationMd5) {
    toMatch.fullCameraLocationMd5 = fullCameraLocationMd5;
  }

  if (site) {
    toMatch.site = site;
  }

  if (subSite) {
    toMatch.subSite = subSite;
  }

  if (year) {
    toMatch.year = year;
  } else {
    return res(new Error('請輸入年份'));
  }

  if (projectId) {
    toMatch.projectId = projectId;
  } else {
    return res(new Error('projectId missing'));
  }

  const mma = db.collection('MultimediaAnnotation');
  const aggregateQuery = [
    {
      $match: toMatch,
    },
    {
      $group: {
        _id: {
          fullCameraLocationMd5: '$fullCameraLocationMd5',
          month: '$month',
        },
        num: {
          $sum: 1,
        },
        projectId: { $first: '$projectId' },
        projectTitle: { $first: '$projectTitle' },
        site: { $first: '$site' },
        subSite: { $first: '$subSite' },
        cameraLocation: { $first: '$cameraLocation' },
      },
    },
    {
      $group: {
        _id: '$_id.fullCameraLocationMd5',
        projectId: { $first: '$projectId' },
        projectTitle: { $first: '$projectTitle' },
        site: { $first: '$site' },
        subSite: { $first: '$subSite' },
        cameraLocation: { $first: '$cameraLocation' },
        monthly_num: {
          $push: {
            month: '$_id.month',
            num: '$num',
          },
        },
      },
    },
    {
      $lookup: {
        from: 'Project',
        localField: '_id',
        foreignField: 'cameraLocations.fullCameraLocationMd5',
        as: 'cameraLocationMeta',
      },
    },
    {
      $project: {
        _id: '$_id',
        fullCameraLocationMd5: '$_id',
        projectTitle: '$projectTitle',
        site: '$site',
        subSite: '$subSite',
        cameraLocation: '$cameraLocation',
        monthly_num: '$monthly_num',
        cameraLocationMeta: '$cameraLocationMeta.cameraLocations',
      },
    },
    {
      $unwind: '$cameraLocationMeta',
    },
    {
      $unwind: '$cameraLocationMeta',
    },
    {
      $redact: {
        $cond: [
          {
            $eq: [
              '$cameraLocationMeta.fullCameraLocationMd5',
              '$fullCameraLocationMd5',
            ],
          },
          '$$KEEP',
          '$$PRUNE',
        ],
      },
    },
    {
      $project: {
        _id: '$_id',
        fullCameraLocationMd5: '$fullCameraLocationMd5',
        projectId: '$projectId',
        projectTitle: '$projectTitle',
        site: '$site',
        subSite: '$subSite',
        cameraLocation: '$cameraLocation',
        monthly_num: '$monthly_num',
        // cameraLocationMeta: "$cameraLocationMeta",
        wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
        wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
      },
    },
  ];

  const rows = await mma
    .aggregate(aggregateQuery)
    .toArray()
    .catch(err => res(err));

  res(null, rows);
};
