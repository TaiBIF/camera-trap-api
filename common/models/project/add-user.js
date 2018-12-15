module.exports = async ({ res, req, data, db, myProject }) => {
  const { userId, projectId } = req.params;
  const { role } = data;
  const user = db.collection('CtpUser');

  const query = {
    userId,
  };

  const row = await user.findOne(query).catch(err => res(err.message));

  const hasMatchedProject = row.project_roles.find(
    p => p.projectId === projectId,
  );

  if (hasMatchedProject) {
    hasMatchedProject.role = [...new Set([...hasMatchedProject.role, ...role])];
  } else {
    row.project_roles = [
      ...row.project_roles,
      {
        projectTitle: myProject.project_roles.projectTitle,
        projectId,
        role,
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
