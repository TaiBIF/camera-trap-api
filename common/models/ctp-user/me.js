const errors = require('../../errors');

module.exports = async ({ req, res, db }) => {
  if (!req.session.user_info) {
    return res(new errors.Http403('User is not logged in.'));
  }

  const { userId } = req.session.user_info;

  const cu = db.collection('CtpUser');
  const Proj = db.collection('Project');

  let user;
  try {
    user = await cu.findOne(
      {
        _id: userId,
      },
      {
        projection: {
          _id: 0,
          idTokenHash: 0,
        },
      },
    );
  } catch (error) {
    return res(error);
  }
  if (!user.speciesKeys || !Object.keys(user.speciesKeys).length) {
    // append defaults
    const projects = user.project_roles.map(p => p.projectId);
    let speciesRows = [];
    try {
      speciesRows = await Proj.aggregate()
        .match({
          _id: {
            $in: projects,
          },
        })
        .project({
          speciesList: 1,
        })
        .toArray();
    } catch (error) {
      return res(error);
    }
    let species = speciesRows.reduce((a, b) => a.concat(b.speciesList), []);
    species = [...new Set(species)].filter(s => !!s);
    user.speciesKeys = {
      ...species.reduce(
        (keys, s) => ({
          [s]: null,
          ...keys,
        }),
        {},
      ),
      ...user.speciesKeys,
    };
  }

  res(null, user);
};
