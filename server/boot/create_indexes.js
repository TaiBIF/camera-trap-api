module.exports = function(app) {
  app.datasources.ctMongoDb40.connector.connect((err, db) => {
    const createIndex = function(MongoCollection, indexes) {
      indexes.forEach(index => {
        MongoCollection.createIndex(index, (erri, ret) => {
          if (err) {
            console.log(erri);
          } else {
            console.log(`Index ${ret} created.`);
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

    const indexProjectTitle = [
      {
        projectTitle: 1,
      },
    ];

    const indexSite = [
      {
        site: 1,
      },
    ];

    const indexSubSite = [
      {
        subSite: 1,
      },
      {
        sparse: true,
      },
    ];

    const indexCameraLocation = [
      {
        cameraLocation: 1,
      },
    ];

    const indexFullCameraLocationMd5 = [
      {
        fullCameraLocationMd5: 1,
      },
    ];

    const indexUploadedFileName = [
      {
        uploaded_file_name: 1,
      },
    ];

    const indexSpeciesShortCut = [
      {
        'tokens.species_shortcut': 1,
      },
    ];

    let indexes = [
      uniqueIndexToken,
      indexTokenDataKeyValue,
      indexProjectTitle,
      indexSite,
      indexSubSite,
      indexCameraLocation,
      indexFullCameraLocationMd5,
      indexUploadedFileName,
      indexSpeciesShortCut,
    ];
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
