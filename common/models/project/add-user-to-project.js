module.exports = async ({ data, req, res: callback, db }) => {
  const cu = db.collection('CtpUser');

  const { projectTitle, userId } = data;
  const role = data.role ? data.role : 'Member';

  cu.countDocuments({ _id: userId }, (err, res) => {
    if (err) {
      return callback(err);
    }

    if (res) {
      // 如果使用者存在
      cu.countDocuments(
        { _id: userId, 'project_roles.projectTitle': projectTitle },
        (__err, _res) => {
          let update;
          let query;

          if (_res === 0) {
            query = { _id: userId };
            update = {
              $addToSet: {
                project_roles: {
                  projectTitle,
                  roles: [role],
                },
              },
            };
          } else {
            query = {
              _id: userId,
              'project_roles.projectTitle': projectTitle,
            };
            update = {
              $addToSet: {
                'project_roles.$.roles': role,
              },
            };
          }

          console.log(['test', query, update]);

          cu.updateOne(query, update, null, (___err, __res) => {
            if (___err) {
              callback(___err);
            } else {
              // console.log(res);
              callback(null, __res);
            }
          });
        },
      );
    } else {
      callback(new Error("User doesn't exist."));
    }
  });
};
