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
    'conditionExists',
    {
      http: {path: '/exists', verb: 'post'},
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'results', type: [{type: 'object'}] }
    }
  );

  Model.conditionExists = function (req, callback) {
    Model.getDataSource().connector.connect(function(err, db) {
      let _callback = callback;
      let collection = db.collection(Model.definition.name);

      if (req.query.date_time) {
        if (req.query.date_time.$gte) {
          req.query.date_time_original_timestamp = {};
          req.query.date_time_original_timestamp.$gte = new Date(req.query.date_time.$gte).getTime() / 1000;
        }
        if (req.query.date_time.$lte) {
          req.query.date_time_original_timestamp = {};
          req.query.date_time_original_timestamp.$lte = new Date(req.query.date_time.$lte).getTime() / 1000;
        }      
        delete req.query.date_time;
      }

      if (req.query.corrected_date_time) {
        if (req.query.corrected_date_time.$gte) {
          req.query.date_time_corrected_timestamp = {};
          req.query.date_time_corrected_timestamp.$gte = new Date(req.query.corrected_date_time.$gte).getTime() / 1000;
        }
        if (req.query.corrected_date_time.$lte) {
          req.query.date_time_corrected_timestamp = {};
          req.query.date_time_corrected_timestamp.$lte = new Date(req.query.corrected_date_time.$lte).getTime() / 1000;
        }      
        delete req.query.corrected_date_time;
      }

      collection.findOne(req.query, {projection: {_id: 1}}, function(err, data) {
        // console.log(req);
        if (err) {
          _callback(err)
        }
        else {
          //console.log(data);
          _callback(null, data);
          /*
          data.toArray(function(err, result){
            console.log(result);
            _callback(null, result);
          });
          //*/
        }
      });
    });
  }

  Model.remoteMethod (
    'aggregate',
    {
      http: {path: '/aggregate', verb: 'post'},
      accepts: { arg: 'data', type: ['object'], http: { source: 'body' } },
      returns: { arg: 'results', type: ['object'] }
    }
  );

  Model.aggregate = function (req, callback) {
    Model.getDataSource().connector.connect(function(err, db) {
      let _callback = callback;
      let collection = db.collection(Model.definition.name);

      collection.aggregate(req).toArray(function(err, result){
          console.log(result);
           _callback(null, result);
      });
    });
    
  }
}

