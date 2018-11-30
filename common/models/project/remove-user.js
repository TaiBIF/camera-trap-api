const getMyUserId = require('../share/getMyUserId');
const checkIsProjectAdmin = require('../share/checkIsProjectAdmin');
const { ERR } = require('../share/CONST');

module.exports = async ({ res, req, data, db }) => {
  const { userId, projectId } = req.params;

  const user = db.collection('CtpUser');

  const [myProject] = await user
    .aggregate()
    .unwind('$project_roles')
    .match({
      userId: getMyUserId(req),
      'project_roles.projectId': projectId,
    })
    .toArray();

  if (!checkIsProjectAdmin(myProject.project_roles.roles)) {
    return res(ERR.INVALID_PERMISSION);
  }

  const query = {
    userId,
    'project_roles.projectId': projectId,
  };

  const row = await user.findOne(query).catch(err => res(err.message));

  const projectIdx = row.project_roles.findIndex(
    p => p.projectId === projectId,
  );

  row.project_roles.splice(projectIdx, 1);

  await user
    .update(query, {
      $set: row,
    })
    .then(() => {
      const { idTokenHash, ...json } = row;
      res(null, json);
    })
    .catch(err => res(err.message));
};
