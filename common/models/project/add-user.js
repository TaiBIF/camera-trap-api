const getMyUserId = require('../share/getMyUserId');
const checkIsProjectAdmin = require('../share/checkIsProjectAdmin');
const { ERR } = require('../share/CONST');

module.exports = async ({ res, req, data, db }) => {
  const { userId, projectId } = req.params;
  const { roles } = data;
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
  };

  const row = await user.findOne(query).catch(err => res(err.message));

  const hasMatchedProject = row.project_roles.find(
    p => p.projectId === projectId,
  );

  if (hasMatchedProject) {
    hasMatchedProject.roles = [
      ...new Set([...hasMatchedProject.roles, ...roles]),
    ];
  } else {
    row.project_roles = [
      ...row.project_roles,
      {
        projectTitle: myProject.project_roles.projectTitle,
        projectId,
        roles,
      },
    ];
  }

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
