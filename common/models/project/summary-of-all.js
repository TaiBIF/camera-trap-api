module.exports = ({ db, res }) => {
  const mdl = db.collection('CtpUser');
  const aggregateQuery = [
    {
      $unwind: '$project_roles',
    },
    {
      $lookup: {
        from: 'Project',
        localField: 'project_roles.projectId',
        foreignField: 'projectId',
        as: 'project',
      },
    },
    {
      $unwind: '$project',
    },
    {
      $group: {
        _id: '$project._id',
        projectId: { $first: '$project.projectId' },
        projectTitle: { $first: '$project.projectTitle' },
        members: {
          $addToSet: '$userId',
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
        projectId: '$projectId',
        projectTitle: '$projectTitle',
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
      res(_err);
    } else {
      res(null, projectsSummary);
    }
  });
};
