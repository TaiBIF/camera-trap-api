module.exports = async ({ res, db, data }) => {
  const forest = db.collection('ForestCompartmentBoundary');
  const { decimalLongitude, decimalLatitude } = data;

  if (!decimalLongitude) {
    return res('PLEASE SET `decimalLongitude`');
  }

  if (!decimalLatitude) {
    return res('PLEASE SET `decimalLatitude`');
  }

  const rows = await forest
    .find({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [decimalLongitude, decimalLatitude],
          },
        },
      },
    })
    .toArray()
    .catch(err => res(err.message));

  res(null, rows);
};
