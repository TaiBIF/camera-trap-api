/*
  @todo add last modified timestamp.
  TaiBIF/camera-trap-webapp/issues/16#issuecomment-437429780
 */
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
      $lookup: {
        from: 'UploadSession',
        localField: '_id.fullCameraLocationMd5',
        foreignField: 'fullCameraLocationMd5',
        as: 'relatedUploadSessions',
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
        // eslint-disable-next-line
        monthly_num: {
          $push: {
            month: '$_id.month',
            num: '$num',
            lastUploaded: {
              $max: '$relatedUploadSessions.modified',
            },
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
        // eslint-disable-next-line
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
        // eslint-disable-next-line
        monthly_num: '$monthly_num',
        // cameraLocationMeta: "$cameraLocationMeta",
        // eslint-disable-next-line
        wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
        // eslint-disable-next-line
        wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
      },
    },
  ];

  console.log(JSON.stringify(aggregateQuery, null, 2));

  mmm.aggregate(aggregateQuery).toArray((_err, locationMonthNum) => {
    if (_err) {
      res(_err);
    } else {
      res(null, locationMonthNum);
    }
  });
};
