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


    ////////////////////////////////////////


    let MultimediaAnnotation = db.collection('MultimediaAnnotation');

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
    createIndex(MultimediaAnnotation, indexes);


    ////////////////////////////////////////


    let UploadSession = db.collection('UploadSession');

    let index_upload_user = [
      {"by": 1}
    ];

    let index_upload_location = [
      {"fullCameraLocationMd5": 1}
    ]

    indexes = [index_upload_user, index_upload_location];
    createIndex(UploadSession, indexes);


    ////////////////////////////////////////


    let Project = db.collection('Project');

    let index_unique_location = [
      {"cameraLocations.fullCameraLocationMd5": 1},
      {"unique": true, "sparse": true}
    ];

    indexes = [index_unique_location];
    createIndex(UploadSession, indexes);



  });

}
