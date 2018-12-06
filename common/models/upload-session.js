const errors = require('../errors');

module.exports = function(UploadSession) {
  UploadSession.remoteMethod('getMyUploads', {
    http: { path: '/mine', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  UploadSession.getMyUploads = function(req, callback) {
    if (!req.session.user_info) {
      return callback(new errors.Http403('使用者未登入'));
    }
    const { userId } = req.session.user_info;

    UploadSession.getDataSource().connector.connect((err, db) => {
      if (err) {
        return callback(err);
      }

      const mdl = db.collection('UploadSession');
      mdl
        .find({ by: userId }, { sort: { created: -1 } })
        .toArray((_err, results) => {
          if (_err) {
            return callback(_err);
          }

          return callback(null, results);
        });
    });
  };
};
