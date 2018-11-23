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
          console.log(req);
          if (_err) {
            _callback(_err);
          } else {
            // console.log(data);
            data.toArray((__err, result) => {
              console.log(result);
              _callback(null, result);
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
          // console.log(req);
          if (_err) {
            _callback(_err);
          } else {
            // console.log(data);
            _callback(null, data);
            /*
          data.toArray(function(err, result){
            console.log(result);
            _callback(null, result);
          });
          // */
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
        console.log(result);
        _callback(null, result);
      });
    });
  };
};
