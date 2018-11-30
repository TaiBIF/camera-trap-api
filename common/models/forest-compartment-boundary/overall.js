module.exports = async ({ res, db }) => {
  const forest = db.collection('ForestCompartmentBoundary');

  const rows = await forest
    .aggregate()
    .group({
      _id: '$properties.Name',
      properties: { $first: '$properties' },
      geometry: { $first: '$geometry' },
    })
    .project({
      _id: 0,
      region: '$_id',
      properties: 1,
      geometry: 1,
    })
    .toArray()
    .catch(err => res(err.message));

  res(null, rows);
};
