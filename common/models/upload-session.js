module.exports = function(UploadSession) {
  UploadSession.remoteMethod('getMyUploads', {
    http: { path: '/mine', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  UploadSession.getMyUploads = function(req, callback) {
    console.log(req.headers);

    let user_id;

    try {
      user_id = req.session.user_info.user_id;
    } catch (e) {
      callback(new Error('使用者未登入'));
    }

    // TODO: 只在測試環境使用，正式環境要把這個 header 拿掉
    try {
      user_id = req.headers['camera-trap-user-id'];
    } catch (e) {
      callback(new Error('使用者未登入'));
    }

    UploadSession.getDataSource().connector.connect((err, db) => {
      if (err) {
        return callback(err);
      }

      const mdl = db.collection('UploadSession');
      mdl
        .find({ by: user_id }, { sort: { created: -1 } })
        .toArray((err, results) => {
          if (err) {
            return callback(err);
          }

          return callback(null, results);
        });
    });
  };
};
