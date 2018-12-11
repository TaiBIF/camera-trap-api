const errors = require('../../errors');

module.exports = async ({ req, res, db, data }) => {
  if (!req.session.user_info) {
    return res(new errors.Http403('使用者未登入'));
  }

  const { userId } = req.session.user_info;

  const cu = db.collection('CtpUser');
  const user = await cu
    .findOne(
      {
        _id: userId,
      },
      {
        projection: {
          idTokenHash: 0,
        },
      },
    )
    .catch(err => res(err));

  Object.assign(user, data);

  await cu
    .updateOne(
      {
        _id: userId,
      },
      {
        $set: user,
      },
    )
    .catch(err => res(err));

  res(null, user);
};
