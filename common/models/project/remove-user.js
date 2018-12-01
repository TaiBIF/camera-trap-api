module.exports = async ({ res, req, data, db }) => {
  const { userId, projectId } = req.params;

  const user = db.collection('CtpUser');

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
