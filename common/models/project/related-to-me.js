module.exports = ({ data, req, res, db }) => {
  // allowed: project, funder, projectStartDate, earliestRecordTimestamp, ...
  let sortKey = data.sort_key || 'projectStartDate';
  sortKey = `project_metadata.${sortKey}`;

  // let pm = db.collection(Project.definition.name);
  const cu = db.collection('CtpUser');
  // TODO: remove data.userId part from following line

  let userId;
  try {
    // TODO: camera-trap-user-id 只在測試環境使用，正式環境要把這個 headers 拿掉
    userId = req.headers['camera-trap-user-id'] || req.session.user_info.userId;
  } catch (e) {
    return res(new Error('使用者未登入'));
  }

  const sorts = {};
  sorts[sortKey] = 1;

  // @todo naming change! project => title
  const aggregateQuery = [
    { $match: { userId } },
    { $unwind: '$project_roles' },
    { $group: { _id: '$project_roles.projectTitle' } },
    {
      $lookup: {
        from: 'Project',
        localField: '_id',
        foreignField: 'projectTitle',
        as: 'project_metadata',
      },
    },
    { $unwind: '$project_metadata' },
    {
      $project: {
        project_metadata: '$project_metadata',
      },
    },
    {
      $sort: sorts,
    },
  ];

  cu.aggregate(aggregateQuery).toArray((_err, prjs) => {
    res(null, prjs);
  });
};
