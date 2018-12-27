const errors = require('../../errors');

module.exports = async ({ req, res, db, data }) => {
  if (!req.session.user_info) {
    return res(new errors.Http403('使用者未登入'));
  }

  const { userId } = req.session.user_info;

  const cu = db.collection('CtpUser');
  let user;
  try {
    user = await cu.findOne(
      {
        _id: userId,
      },
      {
        projection: {
          idTokenHash: 0,
        },
      },
    );
  } catch (error) {
    return res(error);
  }

  Object.assign(user, data);

  try {
    await cu.updateOne(
      {
        _id: userId,
      },
      {
        $set: user,
      },
    );
  } catch (error) {
    return res(error);
  }

  res(null, user);
};
