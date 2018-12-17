module.exports = async ({ req, data, res, db }) => {
  const df = db.collection('DataFieldAvailable');
  const rows = await df
    .find({
      fieldStatus: 'approved',
    })
    .toArray()
    .catch(err => res(err));

  res(null, rows);
};
