module.exports = function(Model, options) {
  'use strict';

  Model.remoteMethod (
    'query',
    {
      http: {path: '/query', verb: 'post'},
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'results', type: [{type: 'object'}] }
    }
  );

  Model.query = function (req, callback) {
    Model.getDataSource().connector.connect(function(err, db) {
      let _callback = callback;
      let collection = db.collection(Model.definition.name);

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
      //*/

      collection.find(req.query, {projection: req.projection}, function(err, data) {
        console.log(req);
        if (err) {
          _callback(err)
        }
        else {
          //console.log(data);
          data.toArray(function(err, result){
            console.log(result);
            _callback(null, result);
          });
        }
      });


    });
    
  }

  Model.remoteMethod (
    'aggregate',
    {
      http: {path: '/aggregate', verb: 'post'},
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'results', type: [{type: 'object'}] }
    }
  );

  Model.aggregate = function (req, callback) {
    Model.getDataSource().connector.connect(function(err, db) {
      let _callback = callback;
      let collection = db.collection(Model.definition.name);

      collection.aggregate(req.aggregate, {}, function(err, data) {
        // console.log(req);
        if (err) {
          _callback(err)
        }
        else {
          //console.log(data);
          data.toArray(function(err, result){
            console.log(result);
            _callback(null, result);
          });
        }
      });
    });
  }
}
