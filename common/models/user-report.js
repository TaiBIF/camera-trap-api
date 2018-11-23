const uuid = require('uuid');

module.exports = function(UserReport) {
  UserReport.remoteMethod('submitReport', {
    http: { path: '/submit', verb: 'post' },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  UserReport.submitReport = function(data, req, callback) {
    console.log(req.headers);

    UserReport.getDataSource().connector.connect((err, db) => {
      if (err) {
        return callback(err);
      }

      const id = uuid();
      const now = Date.now() / 1000;
      const insertQuery = {
        _id: id,
        reportId: id,
        reportType: data.reportType,
        reportContentType: data.reportContentType,
        description: data.description,
        email: data.email,
        attachments: data.attachments || [],
        modified: now,
        created: now,
      };

      const mdl = db.collection('UserReport');
      mdl.insertOne(insertQuery, {}, (_err, result) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, result);
        }
      });
    });
  };
};
