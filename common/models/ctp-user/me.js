const errors = require('../../errors');

module.exports = async ({ req, res, db }) => {
  if (!req.session.user_info) {
    return res(new errors.Http403('使用者未登入'));
  }

  const { userId } = req.session.user_info;

  const cu = db.collection('CtpUser');
  const Proj = db.collection('Project');

  const user = await cu
    .findOne(
      {
        _id: userId,
      },
      {
        projection: {
          _id: 0,
          idTokenHash: 0,
        },
      },
    )
    .catch(err => res(err));

  const projects = user.project_roles.map(p => p.projectId);

  const speciesRows = await Proj.aggregate()
    .match({
      _id: {
        $in: projects,
      },
    })
    .project({
      speciesList: 1,
    })
    .toArray()
    .catch(err => res(err));

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

  res(null, user);
};
