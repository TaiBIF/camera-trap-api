module.exports = ({ data, db, res }) => {
  const { projectId } = data;

  const mdl = db.collection('Project');
  const aggregateQuery = [
    { $match: { _id: projectId } },
    { $unwind: '$dataFieldEnabled' },
    {
      $lookup: {
        from: 'DataFieldAvailable',
        localField: 'dataFieldEnabled',
        foreignField: 'key',
        as: 'field_details',
      },
    },
    {
      $project: {
        // eslint-disable-next-line
        field_details: '$field_details',
        speciesList: '$speciesList',
        dailyTestTime: '$dailyTestTime',
      },
    },
    { $unwind: '$field_details' },
    {
      $group: {
        _id: null,
        speciesList: { $first: '$speciesList' },
        dailyTestTime: { $first: '$dailyTestTime' },
        fieldDetails: { $push: '$field_details' },
      },
    },
  ];

  // console.log(JSON.stringify(aggregate_query, null, 2));

  mdl.aggregate(aggregateQuery).toArray((_err, projectDataFields) => {
    if (_err) {
      res(_err);
    } else {
      res(null, projectDataFields);
    }
  });
};
