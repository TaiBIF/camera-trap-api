module.exports = ({ data, req, res, db }) => {
  let userId;
  try {
    // TODO: camera-trap-user-id 只在測試環境使用，正式環境要把這個 headers 拿掉
    userId =
      req.headers['camera-trap-user-id'] || req.session.user_info.user_id;
  } catch (e) {
    res(new Error('使用者未登入'));
  }

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
          cu.updateOne(
            { _id: userId },
            {
              $addToSet: {
                project_roles: {
                  projectTitle: data.projectTitle,
                  roles: ['ProjectManager'],
                },
              },
            },
            null,
            (___err, _res) => {
              res(null, _res);
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
