'use strict';

var md5 = require('md5');

module.exports = function(MultimediaAnnotations) {

  MultimediaAnnotations.observe('before save', function(context, next) {
    // console.log(context);
    context.instance.url_md5 = md5(context.instance.url);
    context.instance.id = context.instance.url_md5;
    
    next();
  });

  MultimediaAnnotations.query = function (query_args, callback) {
    MultimediaAnnotations.getDataSource().connector.connect(function(err, db) {
      var _callback = callback;
      var collection = db.collection('MultimediaAnnotations');

      var query = {'$or': []};
      for (var key in query_args) {
        var _query = {};
        if (query_args.hasOwnProperty(key)) {
          _query["tokens.data.key"] = key;
          _query["tokens.data.value"] = query_args[key];
          query['$or'].push(_query);
        }
      }

      collection.find(query, function(err, data) {
        console.log(query);
        if (err) {
          _callback(err)
        }
        else {
          data.toArray(function(err, result){
            //console.log(result);
            _callback(null, result);
          });
        }
      });
    });
    
  }

  MultimediaAnnotations.remoteMethod (
    'query',
    {
      http: {path: '/query', verb: 'post'},
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'results', type: [{type: 'object'}] }
    }
  );

};
