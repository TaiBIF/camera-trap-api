const getMyUserId = require('./getMyUserId');
const { ERR } = require('./CONST');

const checkProjectRoles = (checkedRoles = []) => {
  const rolesSet = new Set(checkedRoles);

  return routerFunc => async ({ db, req, res, data }) => {
    const user = db.collection('CtpUser');
    const projectId = req.params.projectId || data.projectId;

    const [myProject] = await user
      .aggregate()
      .unwind('$project_roles')
      .match({
        userId: getMyUserId(req),
        'project_roles.projectId': projectId,
      })
      .toArray();

    const isChecked =
      myProject.project_roles && rolesSet.has(myProject.project_roles.role);

    if (!isChecked) {
      return res(ERR.INVALID_PERMISSION);
    }

    routerFunc({ db, req, res, data, myProject });
  };
};

module.exports = {
  withCheckProjectAdmin: routerFunc =>
    checkProjectRoles([
      'ProjectManager',
      'Researcher',
      'SysAdmin',
      'ProjectInitiator',
    ])(routerFunc),
};
