module.exports = req =>
  (req.session.user_info && req.session.user_info.userId) ||
  req.headers['camera-trap-user-id'];
