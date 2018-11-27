module.exports = ({ db, callback }) => {
  const mdl = db.collection('CtpUser');
  const aggregateQuery = [
    {
      $unwind: '$project_roles',
    },
    {
      $unwind: '$project_roles.roles',
    },
    {
      $lookup: {
        from: 'Project',
        localField: 'project_roles.projectTitle',
        foreignField: 'projectTitle',
        as: 'project',
      },
    },
    {
      $unwind: '$project',
    },
    {
      $group: {
        _id: '$project._id',
        members: {
          $addToSet: '$user_id',
        },
        funder: { $first: '$project.funder' },
        coverImage: { $first: '$project.cover_image' },
        earliestRecordTimestamp: {
          $first: '$project.earliestRecordTimestamp',
        },
      },
    },
    {
      $project: {
        _id: false,
        projectTitle: '$_id',
        members: '$members',
        funder: '$funder',
        coverImage: '$coverImage',
        earliestRecordTimestamp: '$earliestRecordTimestamp',
      },
    },
  ];

  // console.log(JSON.stringify(aggregate_query, null, 2));

  mdl.aggregate(aggregateQuery).toArray((_err, projectsSummary) => {
    if (_err) {
      callback(_err);
    } else {
      callback(null, projectsSummary);
    }
  });
};
