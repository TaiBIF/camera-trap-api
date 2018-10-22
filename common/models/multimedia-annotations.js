'use strict';

module.exports = function(MultimediaAnnotations) {
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
                  "revisions": {created: _revision.created, tokens: _revision.tokens}
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
      MultimediaAnnotations.getDataSource().connector.connect(function(err, db) {
        if (err) return next(err);

        let MAR = db.collection("multimedia-annotation-revisions");
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

  MultimediaAnnotations.afterRemote("bulkInsert", addRevision);   // tested
  MultimediaAnnotations.afterRemote("bulkReplace", addRevision);  // tested
  MultimediaAnnotations.afterRemote("bulkUpdate", addRevision);   // tested

  MultimediaAnnotations.disableRemoteMethodByName("upsert");                               // disables PATCH /MultimediaAnnotationss
  MultimediaAnnotations.disableRemoteMethodByName("find");                                 // disables GET /MultimediaAnnotationss
  MultimediaAnnotations.disableRemoteMethodByName("replaceOrCreate");                      // disables PUT /MultimediaAnnotationss
  MultimediaAnnotations.disableRemoteMethodByName("create");                               // disables POST /MultimediaAnnotationss

  MultimediaAnnotations.disableRemoteMethodByName("prototype.updateAttributes");           // disables PATCH /MultimediaAnnotationss/{id}
  MultimediaAnnotations.disableRemoteMethodByName("findById");                             // disables GET /MultimediaAnnotationss/{id}
  MultimediaAnnotations.disableRemoteMethodByName("exists");                               // disables HEAD /MultimediaAnnotationss/{id}
  MultimediaAnnotations.disableRemoteMethodByName("replaceById");                          // disables PUT /MultimediaAnnotationss/{id}
  MultimediaAnnotations.disableRemoteMethodByName("deleteById");                           // disables DELETE /MultimediaAnnotationss/{id}

  MultimediaAnnotations.disableRemoteMethodByName('prototype.__get__accessTokens');        // disable GET /MultimediaAnnotationss/{id}/accessTokens
  MultimediaAnnotations.disableRemoteMethodByName('prototype.__create__accessTokens');     // disable POST /MultimediaAnnotationss/{id}/accessTokens
  MultimediaAnnotations.disableRemoteMethodByName('prototype.__delete__accessTokens');     // disable DELETE /MultimediaAnnotationss/{id}/accessTokens

  MultimediaAnnotations.disableRemoteMethodByName('prototype.__findById__accessTokens');   // disable GET /MultimediaAnnotationss/{id}/accessTokens/{fk}
  MultimediaAnnotations.disableRemoteMethodByName('prototype.__updateById__accessTokens'); // disable PUT /MultimediaAnnotationss/{id}/accessTokens/{fk}
  MultimediaAnnotations.disableRemoteMethodByName('prototype.__destroyById__accessTokens');// disable DELETE /MultimediaAnnotationss/{id}/accessTokens/{fk}

  MultimediaAnnotations.disableRemoteMethodByName('prototype.__count__accessTokens');      // disable  GET /MultimediaAnnotationss/{id}/accessTokens/count

  MultimediaAnnotations.disableRemoteMethodByName("prototype.verify");                     // disable POST /MultimediaAnnotationss/{id}/verify
  MultimediaAnnotations.disableRemoteMethodByName("changePassword");                       // disable POST /MultimediaAnnotationss/change-password
  MultimediaAnnotations.disableRemoteMethodByName("createChangeStream");                   // disable GET and POST /MultimediaAnnotationss/change-stream

  MultimediaAnnotations.disableRemoteMethodByName("confirm");                              // disables GET /MultimediaAnnotationss/confirm
  MultimediaAnnotations.disableRemoteMethodByName("count");                                // disables GET /MultimediaAnnotationss/count
  MultimediaAnnotations.disableRemoteMethodByName("findOne");                              // disables GET /MultimediaAnnotationss/findOne

  MultimediaAnnotations.disableRemoteMethodByName("login");                                // disables POST /MultimediaAnnotationss/login
  MultimediaAnnotations.disableRemoteMethodByName("logout");                               // disables POST /MultimediaAnnotationss/logout

  MultimediaAnnotations.disableRemoteMethodByName("resetPassword");                        // disables POST /MultimediaAnnotationss/reset
  MultimediaAnnotations.disableRemoteMethodByName("setPassword");                          // disables POST /MultimediaAnnotationss/reset-password
  MultimediaAnnotations.disableRemoteMethodByName("update");                               // disables POST /MultimediaAnnotationss/update
  MultimediaAnnotations.disableRemoteMethodByName("upsertWithWhere");                      // disables POST /MultimediaAnnotationss/upsertWithWhere
      
};
