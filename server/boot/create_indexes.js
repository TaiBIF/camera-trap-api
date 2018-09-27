'use strict'

module.exports = function(app) {

  app.datasources.mongodb34.connector.connect(function(err, db) {

    var collection = db.collection('MultimediaAnnotations');

    var unique_index_url_md5 = [
      {
        "url_md5": 1,
      },
      {
        "unique": true
      }
    ];

    var unique_index_token = [
      {
        "tokens.token_id": 1,
      },
      {
        "unique": true /*,
        "partialFilterExpression": {
          "tokens.data.value": {
            "$exists": true
          }
        }
        //*/
      }
    ];

    var index_token_data_key_value = [
      {
        "tokens.data.key": 1,
        "tokens.data.value": 1
      },
      {
        sparse: true
      }
    ];

    var indexes = [unique_index_url_md5, unique_index_token, index_token_data_key_value];

    indexes.forEach(function(index) {
      collection.createIndex(index, function(err, ret) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(ret);
        }
      });
    });
  });

}
