module.exports = ({ data, req, res, db }) => {
  const { fullCameraLocationMd5, year, site, subSite, projectId } = data;
  const toMatch = {};
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

  const mmm = db.collection('MultimediaMetadata');
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
        projectId: '$projectId',
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

  mmm.aggregate(aggregateQuery).toArray((_err, locationMonthNum) => {
    if (_err) {
      res(_err);
    } else {
      res(null, locationMonthNum);
    }
  });
};
