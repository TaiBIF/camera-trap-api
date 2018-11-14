'use strict';

const Json2csvParser = require('json2csv').Parser;

module.exports = function(MultimediaAnnotation) {
  

  let addRevision = function(context, user, next) {
    let args_data = context.args.data;
    // console.log(context.args.data);
    let method = context.methodString.split(".").pop();
    console.log(method);

    let revisions = [];
    args_data.forEach(function(d) {

      let _revision, make_revision, _tokens = [];
      _revision = {};
      make_revision = true;
      let modifiedBy;

      switch (method) {
        case "bulkUpdate":

          try {
            console.log("TRYING");
            let testRequired = d.updateOne.update.$set.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            modifiedBy = d.updateOne.update.$set.modifiedBy;
          }
          catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.updateOne.filter._id;
          _revision.created = d.updateOne.update.$set.modified;
          _tokens = d.updateOne.update.$set.tokens;

          break;
        case "bulkInsert":
          // console.log(d.insertOne);
          try {
            console.log("Trying to create a data revision.");
            let testRequired = d.insertOne.document.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            console.log(testRequired);
            modifiedBy = d.insertOne.document.modifiedBy;
          }
          catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.insertOne.document._id;
          _revision.created = d.insertOne.document.modified;
          _tokens = d.insertOne.document.tokens;
          break;

        case "bulkReplace":

          try {
            console.log("TRYING");
            let testRequired = d.replaceOne.replacement.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            console.log(testRequired);
            modifiedBy = d.replaceOne.replacement.modifiedBy;
          }
          catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.replaceOne.filter._id;
          _revision.created = d.replaceOne.replacement.modified;
          _tokens = d.replaceOne.replacement.tokens;
          break;
      }

      if (make_revision) {
        
        _revision.tokens = _tokens.map(t => {
          let key_val_pair = {};
          let keyCounter = 0;
          t.data.forEach(_d => {
            if (!!_d.key) {
              keyCounter++;
              key_val_pair[_d.key] = _d.value;
            }
          });

          if (keyCounter > 0) {
            return {
              // token_id: t.token_id,
              data: t.data,
              summary: key_val_pair
            }
          }
          else {
            return false;
          }
        });

        
        _revision.tokens = _revision.tokens.filter(t => (t !== false));

        if (_revision.tokens.length) {
          // console.log(_revision);
          let updateOne = {
            "updateOne": {
              "filter": {_id: _revision.url_md5},
              "update": {
                "$push": {
                  "revisions": {
                    $each: [
                      {modifiedBy: modifiedBy, created: _revision.created, tokens: _revision.tokens}
                    ],
                    $slice: -5
                  }
                },
                "$setOnInsert": {
                  _id: _revision.url_md5,
                  url_md5: _revision.url_md5
                }
              },
              "upsert": true
            }
          }
          
          revisions.push(updateOne);
        }
      }
    });

    // console.log(JSON.stringify(revisions, null, 2));
    if (revisions.length > 0) {
      MultimediaAnnotation.getDataSource().connector.connect(function(err, db) {
        if (err) return next(err);

        let MAR = db.collection("MultimediaAnnotationRevision");
        // console.log(MAR);

        MAR.bulkWrite(revisions, {ordered: false}, function(err, results) {
          if (err) {
            next(err);
          }
          else {
            console.log(results);
            next();
          }
        });
      });
    }
    else {
      next();
    }
  }

  MultimediaAnnotation.remoteMethod (
    'basicCalculation',
    {
        http: {path: '/calculation', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  MultimediaAnnotation.basicCalculation = function (data, req, callback) {
    MultimediaAnnotation.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);
 
      let toMatch = {};

      let projectTitle = data.projectTitle;
      if (projectTitle) {
        toMatch['projectTitle'] = projectTitle;
      }
      else {
        return callback(new Error());
      }

      let site = data.site;
      if (site) {
        toMatch['site'] = site;
      }
      else {
        return callback(new Error());
      }

      let subSite = data.subSite;
      if (subSite) {
        toMatch['subSite'] = subSite;
      }

      let species = data.species;
      //*
      if (species) {
        toMatch['tokens.data.key'] = 'species';
        toMatch['tokens.data.value'] = species;
      }
      //*/

      let fullCameraLocationMd5s = data.fullCameraLocationMd5s;
      if (Array.isArray(fullCameraLocationMd5s) && fullCameraLocationMd5s.length > 0) {
        toMatch['fullCameraLocationMd5'] = {'$in': fullCameraLocationMd5s};
      }

      let projection = {
        url: true, 
        projectTitle: true,
        site: true,
        subSite: true,
        cameraLocation: true,
        fullCameraLocationMd5: true,
        tokens: false,
        'tokens.data.key': true,
        'tokens.data.value': true,
        //*
        tokens: {
          $elemMatch: {
            'data.key': 'species',
            'data.value': species,
          }
        },

        //*/
        corrected_date_time: true,
        date_time_corrected_timestamp: true
      }

      let prjMdl = db.collection("Project");
      prjMdl.findOne({projectTitle: projectTitle}, {projection: {dataFieldEnabled: true}}, function(err, res){
        if (err) {
          callback(err);
        }
        else {
          if (res) {
            let mdl = db.collection("MultimediaAnnotation");
            let requiredFields = res.dataFieldEnabled || [];
            requiredFields.push('species');

            mdl.find(toMatch, {projection: projection}).toArray(function(err, results) {
              if (err) {
                callback(err);
              }
              else {

                let csvTemplate = {};
                requiredFields.forEach(function(f){
                  csvTemplate[f] = "NA";
                });


                const keys = Object.keys(csvTemplate).sort((a,b) => b>a);
                let fields = ['site', 'subSite', 'cameraLocation', 'filename', 'date_time'];
                fields = fields.concat(keys);
                const opts = { fields };
                const parser = new Json2csvParser(opts);

                let csvRecords = [];

                results.forEach(function(annotation){
                  annotation.tokens.forEach(function(token){
                    let csvRecord = csvTemplate;
                    token.data.forEach(function(d){
                      if (csvRecord[d.key]) {
                        csvRecord[d.key] = d.value || 'NA';
                      }
                    });
                    //csvRecordArr = keys.map(key => csvRecord[key]);
                    csvRecord.filename = annotation.url.split("/").pop();
                    csvRecord.date_time = annotation.corrected_date_time;
                    csvRecord.site = annotation.site;
                    csvRecord.subSite = annotation.subSite;
                    csvRecord.cameraLocation = annotation.cameraLocation;
                    csvRecords.push(csvRecord);
                  });

                  let csv = parser.parse(csvRecords);
                  // TODO: write to S3
                  let AWS = MultimediaAnnotation.app.aws;
                  AWS.config.credentials.get(function(err){
                    if (err) {return callback(err)}
                    let s3 = new AWS.S3();
                    s3.upload({Bucket: 'taibif-s3-mount-bucket', Key: "data_for_calculation/user_id_placeholder/session_id_placeholder", Body: csv, ContentType: "text/csv"/*, Tagging: tags_string*/}, {},
                      function(err, data) {
                        if (err) {
                          console.log('ERROR!');
                          callback(err);
                        }
                        else {
                          console.log('OK');
                          callback(null, csv);
                        }
                      });
                  });

                });

                //callback(null, results);
              }
            });
          }
          else {
            callback(null, null);
          }
        }
      });

      

    });
  }


  MultimediaAnnotation.afterRemote("bulkInsert", addRevision);   // tested
  MultimediaAnnotation.afterRemote("bulkReplace", addRevision);  // tested
  MultimediaAnnotation.afterRemote("bulkUpdate", addRevision);   // tested

  MultimediaAnnotation.disableRemoteMethodByName("upsert");                               // disables PATCH /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName("find");                                 // disables GET /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName("replaceOrCreate");                      // disables PUT /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName("create");                               // disables POST /MultimediaAnnotation

  MultimediaAnnotation.disableRemoteMethodByName("prototype.updateAttributes");           // disables PATCH /MultimediaAnnotation/{id}
  // MultimediaAnnotation.disableRemoteMethodByName("findById");                             // disables GET /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName("exists");                               // disables HEAD /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName("replaceById");                          // disables PUT /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName("deleteById");                           // disables DELETE /MultimediaAnnotation/{id}

  MultimediaAnnotation.disableRemoteMethodByName('prototype.__get__accessTokens');        // disable GET /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName('prototype.__create__accessTokens');     // disable POST /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName('prototype.__delete__accessTokens');     // disable DELETE /MultimediaAnnotation/{id}/accessTokens

  MultimediaAnnotation.disableRemoteMethodByName('prototype.__findById__accessTokens');   // disable GET /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName('prototype.__updateById__accessTokens'); // disable PUT /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName('prototype.__destroyById__accessTokens');// disable DELETE /MultimediaAnnotation/{id}/accessTokens/{fk}

  MultimediaAnnotation.disableRemoteMethodByName('prototype.__count__accessTokens');      // disable  GET /MultimediaAnnotation/{id}/accessTokens/count

  MultimediaAnnotation.disableRemoteMethodByName("prototype.verify");                     // disable POST /MultimediaAnnotation/{id}/verify
  MultimediaAnnotation.disableRemoteMethodByName("changePassword");                       // disable POST /MultimediaAnnotation/change-password
  MultimediaAnnotation.disableRemoteMethodByName("createChangeStream");                   // disable GET and POST /MultimediaAnnotation/change-stream

  MultimediaAnnotation.disableRemoteMethodByName("confirm");                              // disables GET /MultimediaAnnotation/confirm
  MultimediaAnnotation.disableRemoteMethodByName("count");                                // disables GET /MultimediaAnnotation/count
  MultimediaAnnotation.disableRemoteMethodByName("findOne");                              // disables GET /MultimediaAnnotation/findOne

  MultimediaAnnotation.disableRemoteMethodByName("login");                                // disables POST /MultimediaAnnotation/login
  MultimediaAnnotation.disableRemoteMethodByName("logout");                               // disables POST /MultimediaAnnotation/logout

  MultimediaAnnotation.disableRemoteMethodByName("resetPassword");                        // disables POST /MultimediaAnnotation/reset
  MultimediaAnnotation.disableRemoteMethodByName("setPassword");                          // disables POST /MultimediaAnnotation/reset-password
  MultimediaAnnotation.disableRemoteMethodByName("update");                               // disables POST /MultimediaAnnotation/update
  MultimediaAnnotation.disableRemoteMethodByName("upsertWithWhere");                      // disables POST /MultimediaAnnotation/upsertWithWhere
      
};
