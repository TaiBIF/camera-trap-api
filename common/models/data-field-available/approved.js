module.exports = async ({ req, data, res, db }) => {
  const df = db.collection('DataFieldAvailable');
  let rows;
  try {
    rows = await df
      .find({
        fieldStatus: 'approved',
      })
      .toArray();
  } catch (error) {
    return res(error);
  }

  res(null, rows);
};
