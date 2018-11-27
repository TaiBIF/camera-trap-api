module.exports = ({ data, db, callback }) => {
  const { projectTitle } = data;

  const mdl = db.collection('Project');
  const aggregateQuery = [
    { $match: { _id: projectTitle } },
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
      callback(_err);
    } else {
      callback(null, projectDataFields);
    }
  });
};
