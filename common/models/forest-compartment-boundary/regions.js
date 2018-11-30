module.exports = async ({ res, db, data }) => {
  const forest = db.collection('ForestCompartmentBoundary');
  const { coordinates = [] } = data;

  const rows = await forest
    .find({
      geometry: {
        $geoWithin: {
          $geometry: { type: 'MultiPolygon', coordinates },
        },
      },
    })
    .toArray()
    .catch(err => res(err.message));

  res(null, rows);
};
