module.exports = function(Model, options) {
  Model.remoteMethod('query', {
    http: { path: '/query', verb: 'post' },
    accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
    returns: { arg: 'results', type: [{ type: 'object' }] },
  });

  Model.query = function(req, callback) {
    Model.getDataSource().connector.connect((err, db) => {
      const _callback = callback;
      const collection = db.collection(Model.definition.name);

      /* 產地直送 mongodb query 語法
      var query = {'$or': []};
      for (var key in req) {
        var _query = {};
        if (req.hasOwnProperty(key)) {
          _query["tokens.data.key"] = key;
          _query["tokens.data.value"] = req[key];
          query['$or'].push(_query);
        }
      }
      // */

      let limit = typeof req.limit === 'number' ? req.limit : 1000;

      if (limit <= 0) limit = 1000;
      if (limit >= 10000) limit = 10000;

      const sort = req.sort || {};
      const skip = typeof req.skip === 'number' ? req.skip : 0;

      collection.find(
        req.query,
        { projection: req.projection, limit, skip, sort },
        (_err, data) => {
          if (_err) {
            _callback(_err);
          } else {
            data.toArray((__err, result) => {
              if (
                Model.definition.name === 'MultimediaAnnotationRevision' &&
                result.length > 0
              ) {
                const cu = db.collection('CtpUser');
                const ctpUserTable = {};
                result.forEach(item => {
                  item.revisions.forEach(revision => {
                    if (revision.modifiedBy)
                      ctpUserTable[revision.modifiedBy] = null;
                  });
                });
                const ctpUsers = Object.keys(ctpUserTable);
                cu.find({ _id: { $in: ctpUsers } }, (___err, usersQuery) => {
                  if (___err) {
                    return _callback(___err);
                  }
                  usersQuery.toArray((____err, users) => {
                    if (____err) {
                      return _callback(____err);
                    }
                    users.forEach(user => {
                      ctpUserTable[user._id] = user;
                    });
                    result.forEach((item, iid, itemArr) => {
                      itemArr[iid].revisions.forEach(
                        (revision, rid, revArr) => {
                          if (revision.modifiedBy) {
                            revArr[rid].modifiedBy = {
                              _id: ctpUserTable[revision.modifiedBy]._id,
                              name: ctpUserTable[revision.modifiedBy].name,
                            };
                          } else {
                            revArr[rid].modifiedBy = {
                              _id: 'NA',
                              name: 'NA',
                            };
                          }
                        },
                      );
                    });
                    return _callback(null, result);
                  });
                });
              } else {
                _callback(null, result);
              }
            });
          }
        },
      );
    });
  };

  Model.remoteMethod('conditionExists', {
    http: { path: '/exists', verb: 'post' },
    accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
    returns: { arg: 'results', type: [{ type: 'object' }] },
  });

  Model.conditionExists = function(req, callback) {
    Model.getDataSource().connector.connect((err, db) => {
      const _callback = callback;
      const collection = db.collection(Model.definition.name);

      /* eslint-disable */
      if (req.query.date_time) {
        if (req.query.date_time.$gte) {
          req.query.date_time_original_timestamp = {};
          req.query.date_time_original_timestamp.$gte =
            new Date(`${req.query.date_time.$gte}+8`).getTime() / 1000;
        }
        if (req.query.date_time.$lte) {
          req.query.date_time_original_timestamp = {};
          req.query.date_time_original_timestamp.$lte =
            new Date(`${req.query.date_time.$lte}+8`).getTime() / 1000;
        }
        delete req.query.date_time;
      }

      if (req.query.corrected_date_time) {
        if (req.query.corrected_date_time.$gte) {
          req.query.date_time_corrected_timestamp = {};
          req.query.date_time_corrected_timestamp.$gte =
            new Date(`${req.query.corrected_date_time.$gte}+8`).getTime() / 1000;
        }
        if (req.query.corrected_date_time.$lte) {
          req.query.date_time_corrected_timestamp = {};
          req.query.date_time_corrected_timestamp.$lte =
            new Date(`${req.query.corrected_date_time.$lte}+8`).getTime() / 1000;
        }
        delete req.query.corrected_date_time;
      }

      collection.findOne(
        req.query,
        { projection: { _id: 1 } },
        (_err, data) => {
          if (_err) {
            _callback(_err);
          } else {
            _callback(null, data);
          }
        },
      );
    });
  };

  Model.remoteMethod('aggregate', {
    http: { path: '/aggregate', verb: 'post' },
    accepts: { arg: 'data', type: ['object'], http: { source: 'body' } },
    returns: { arg: 'results', type: ['object'] },
  });

  Model.aggregate = function(req, callback) {
    Model.getDataSource().connector.connect((err, db) => {
      const _callback = callback;
      const collection = db.collection(Model.definition.name);

      collection.aggregate(req).toArray((_err, result) => {
        _callback(null, result);
      });
    });
  };
};
