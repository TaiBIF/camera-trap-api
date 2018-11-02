'use strict';

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

      switch (method) {
        case "bulkUpdate":

          try {
            console.log("TRYING");
            let testRequired = d.updateOne.update.$set.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
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
              token_id: t.token_id,
              data: key_val_pair
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
                      {created: _revision.created, tokens: _revision.tokens}
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
