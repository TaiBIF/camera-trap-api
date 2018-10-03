'use strict'

module.exports = function(app) {

  app.datasources.mongodb34.connector.connect(function(err, db) {

    let createIndex = function (MongoCollection, indexes) {
      indexes.forEach(function(index) {
        MongoCollection.createIndex(index, function(err, ret) {
          if (err) {
            console.log(err);
          }
          else {
            console.log(ret);
          }
        });
      });
    }

    let MultimediaAnnotations = db.collection('MultimediaAnnotations');

    let unique_index_token = [
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

    let index_token_data_key_value = [
      {
        "tokens.data.key": 1,
        "tokens.data.value": 1
      },
      {
        sparse: true
      }
    ];

    let indexes = [unique_index_token, index_token_data_key_value];
    createIndex(MultimediaAnnotations, indexes);


    ////////////////////////////////////////


    let UploadSessions = db.collection('UploadSessions');
    let unique_index_upload_session = [
      {"upload_session_id": 1},
      {"unique": true}
    ];

    let index_upload_user = [
      {"by": 1}
    ];

    let index_upload_location = [
      {"full_location_md5": 1}
    ]

    indexes = [unique_index_upload_session, index_upload_user, index_upload_location];
    createIndex(UploadSessions, indexes);



  });

}
