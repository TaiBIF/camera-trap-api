module.exports = ({ db, res }) => {
  const mdl = db.collection('Project');
  const aggregateQuery = [
    {
      $unwind: '$cameraLocations',
    },
    {
      $project: {
        _id: false,
        projectId: '$projectId',
        projectTitle: '$projectTitle',
        cameraLocation: '$cameraLocations.cameraLocation',
        fullCameraLocationMd5: '$cameraLocations.fullCameraLocationMd5',
        site: '$cameraLocations.site',
        subSite: '$cameraLocations.subSite',
      },
    },
  ];

  // console.log(JSON.stringify(aggregate_query, null, 2));

  mdl.aggregate(aggregateQuery).toArray((_err, allCameraLocations) => {
    if (_err) {
      res(_err);
    } else {
      const results = {};
      allCameraLocations.forEach(loc => {
        results[loc.fullCameraLocationMd5] = loc;
      });
      res(null, results);
    }
  });
};
