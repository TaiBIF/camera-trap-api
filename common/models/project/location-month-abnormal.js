/*
  @todo add last modified timestamp.
  TaiBIF/camera-trap-webapp/issues/16#issuecomment-437429780
 */
module.exports = ({ res, data, db }) => {
  const { year, site, subSite, projectId, fullCameraLocationMd5 } = data;

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
    toMatch['abnormalMonthSpan.year'] = year;
  } else {
    return res(new Error('請輸入年份'));
  }

  if (projectId) {
    toMatch.projectId = projectId;
  } else {
    return res(new Error('projectId missing'));
  }

  const mdl = db.collection('AbnormalData');
  const aggregateQuery = [
    {
      $match: toMatch,
    },
    {
      $unwind: '$abnormalMonthSpan',
    },
    {
      $group: {
        _id: {
          fullCameraLocationMd5: '$fullCameraLocationMd5',
          month: '$abnormalMonthSpan.month',
        },
        projectId: { $first: '$projectId' },
        projectTitle: { $first: '$projectTitle' },
        site: { $first: '$site' },
        subSite: { $first: '$subSite' },
        cameraLocation: { $first: '$cameraLocation' },
        fullCameraLocationMd5: { $first: '$fullCameraLocationMd5' },
        year: { $first: '$abnormalMonthSpan.year' },
        month: { $first: '$abnormalMonthSpan.month' },
        abnormalType: { $first: '$abnormalType' },
        abnormalStartDate: { $first: '$abnormalStartDate' },
        abnormalEndDate: { $first: '$abnormalEndDate' },
        remarks: { $first: '$remarks' },
      },
    },
    {
      $group: {
        _id: '$fullCameraLocationMd5',
        projectId: { $first: '$projectId' },
        projectTitle: { $first: '$projectTitle' },
        site: { $first: '$site' },
        subSite: { $first: '$subSite' },
        cameraLocation: { $first: '$cameraLocation' },
        fullCameraLocationMd5: { $first: '$fullCameraLocationMd5' },
        year: { $first: '$year' },
        month: { $push: '$month' },
        abnormalType: { $first: '$abnormalType' },
        abnormalStartDate: { $first: '$abnormalStartDate' },
        abnormalEndDate: { $first: '$abnormalEndDate' },
        remarks: { $first: '$remarks' },
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
        year: '$year',
        month: '$month',
        projectId: '$projectId',
        projectTitle: '$projectTitle',
        site: '$site',
        subSite: '$subSite',
        cameraLocation: '$cameraLocation',
        fullCameraLocationMd5: '$fullCameraLocationMd5',
        abnormalType: '$abnormalType',
        abnormalStartDate: '$abnormalStartDate',
        abnormalEndDate: '$abnormalEndDate',
        remarks: '$remarks',
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
        year: '$year',
        month: '$month',
        projectId: '$projectId',
        projectTitle: '$projectTitle',
        site: '$site',
        subSite: '$subSite',
        cameraLocation: '$cameraLocation',
        fullCameraLocationMd5: '$fullCameraLocationMd5',
        abnormalType: '$abnormalType',
        abnormalStartDate: '$abnormalStartDate',
        abnormalEndDate: '$abnormalEndDate',
        remarks: '$remarks',
        // eslint-disable-next-line
        wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
        // eslint-disable-next-line
        wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
      },
    },
  ];

  // console.log(JSON.stringify(aggregate_query, null, 2));

  mdl.aggregate(aggregateQuery).toArray((_err, locationMonthAbnormal) => {
    if (_err) {
      res(_err);
    } else {
      res(null, locationMonthAbnormal);
    }
  });
};
