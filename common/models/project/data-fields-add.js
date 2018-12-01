const getMyUserId = require('../share/getMyUserId');

module.exports = async ({ res, req, data, db }) => {
  const { projectId } = req.params;

  const doc = {
    ...data,
    projectId,
    userId: getMyUserId(req),
    key: '', // (留空)
    label: '', // 角況
  };

  const dataField = db.collection('DataFieldAvailable');

  const { ops } = await dataField.insert(doc);

  res(null, ops);
};
