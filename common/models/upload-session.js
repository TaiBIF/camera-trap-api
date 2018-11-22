module.exports = function(UploadSession) {
  UploadSession.remoteMethod('getMyUploads', {
    http: { path: '/mine', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  UploadSession.getMyUploads = function(req, callback) {
    console.log(req.headers);

    let userID;
    try {
      // TODO: camera-trap-user-id 只在測試環境使用，正式環境要把這個 headers 拿掉
      userID =
        req.headers['camera-trap-user-id'] || req.session.user_info.user_id;
    } catch (e) {
      callback(new Error('使用者未登入'));
    }

    UploadSession.getDataSource().connector.connect((err, db) => {
      if (err) {
        return callback(err);
      }

      const mdl = db.collection('UploadSession');
      mdl
        .find({ by: userID }, { sort: { created: -1 } })
        .toArray((_err, results) => {
          if (_err) {
            return callback(_err);
          }

          return callback(null, results);
        });
    });
  };
};
