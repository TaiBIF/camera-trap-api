const uuid = require('uuid');
const errors = require('../../errors');

module.exports = ({ data, req, res, db }) => {
  if (!req.session.user_info) {
    res(new errors.Http403('使用者未登入'));
  }
  const { userId } = req.session.user_info;

  const mdl = db.collection('Project');
  const cu = db.collection('CtpUser');
  mdl.countDocuments({ _id: data.projectTitle }, (_err, prjCnt) => {
    if (prjCnt === 0) {
      cu.find(
        {
          'project_roles.projectTitle': data.projectTitle,
          'project_roles.roles': 'ProjectManager',
        },
        { projection: { _id: true } },
      ).toArray((__err, mngrs) => {
        if (mngrs.length === 0) {
          const newProjectId = uuid();
          cu.updateOne(
            { _id: userId },
            {
              $addToSet: {
                // eslint-disable-next-line
                project_roles: {
                  projectId: newProjectId,
                  projectTitle: data.projectTitle,
                  roles: ['ProjectManager'],
                },
              },
            },
            null,
            (___err, _res) => {
              res(null, { projectId: newProjectId });
            },
          );
          // );
        } else {
          const pms = [];
          mngrs.forEach(mngr => {
            pms.push(mngr._id);
          });
          res(
            new Error(
              `計畫 \`${data.projectTitle}\` 已被\`${pms.join('`, `')}\`註冊.`,
            ),
          );
        }
      });
    } else {
      res(new Error(`計畫 \`${data.projectTitle}\` 已經存在.`));
    }
  });
};
