module.exports = function(app) {
  app.datasources.mongodb34.connector.connect((err, db) => {
    const createIndex = function(MongoCollection, indexes) {
      indexes.forEach(index => {
        MongoCollection.createIndex(index, (erri, ret) => {
          if (err) {
            console.log(erri);
          } else {
            console.log(ret);
          }
        });
      });
    };

    /* media annotation */

    const MultimediaAnnotation = db.collection('MultimediaAnnotation');

    const uniqueIndexToken = [
      {
        'tokens.token_id': 1,
      },
      {
        unique: true,
        /*
          "partialFilterExpression": {
          "tokens.data.value": {
            "$exists": true
          }
        },
        */
      },
    ];

    const indexTokenDataKeyValue = [
      {
        'tokens.data.key': 1,
        'tokens.data.value': 1,
      },
      {
        sparse: true,
      },
    ];

    let indexes = [uniqueIndexToken, indexTokenDataKeyValue];
    createIndex(MultimediaAnnotation, indexes);

    /* media upload */

    const UploadSession = db.collection('UploadSession');

    const indexUploadUser = [{ by: 1 }];

    const indexUploadLocation = [{ fullCameraLocationMd5: 1 }];

    indexes = [indexUploadUser, indexUploadLocation];
    createIndex(UploadSession, indexes);

    /* project */
    /*
    const Project = db.collection('Project');
    */

    const indexUniqueLocation = [
      { 'cameraLocations.fullCameraLocationMd5': 1 },
      { unique: true, sparse: true },
    ];

    indexes = [indexUniqueLocation];
    createIndex(UploadSession, indexes);
  });
};
