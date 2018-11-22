// served as an example
module.exports = function(MultimediaQueryShared) {
  /* 這段搬走了，沒在用喔
  var originalSetup = MultimediaQueryShared.setup;

  MultimediaQueryShared.setup = function() {
    // this will be called everytime a
    // model is extended from this model.

    originalSetup.apply(this, arguments);
    // This is necessary if your
    // MultimediaQueryShared is based of another model, like PersistedModel.

    var ExtendedModel = this;

    ExtendedModel.remoteMethod (
      'query',
      {
        http: {path: '/query', verb: 'post'},
        accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
        returns: { arg: 'results', type: [{type: 'object'}] }
      }
    );

    ExtendedModel.query = function (query_args, callback) {
      ExtendedModel.getDataSource().connector.connect(function(err, db) {
        var _callback = callback;
        var collection = db.collection('CameraTrapBase');

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

  };
  // */
};
