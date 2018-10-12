'use strict';

module.exports = function(MultimediaAnnotations) {
  let addRevision = function(context, user, next) {

    let args_data = context.args.data;
    // console.log(context.args.data);
    let method = context.methodString.split(".").pop();
    console.log(method);

    let revisions = [];
    args_data.forEach(function(d) {

      let _revision;
      _revision = {};

      switch (method) {
        case "bulkUpdate":
          _revision.url_md5 = d.updateOne.filter._id;
          _revision.created = d.updateOne.update.$set.modified;
          _revision.tokens = d.updateOne.update.$set.tokens.map(t => {
            let key_val_pair = {};
            t.data.forEach(_d => {
              key_val_pair[_d.key] = _d.value;
            });
            return {
              token_id: t.token_id,
              data: key_val_pair
            }
          });
          break;
        case "bulkInsert":
          _revision.url_md5 = d.insertOne.document._id;
          _revision.created = d.insertOne.document.modified;
          _revision.tokens = d.insertOne.document.map(t => {
            let key_val_pair = {};
            t.data.forEach(_d => {
              key_val_pair[_d.key] = _d.value;
            });
            return {
              token_id: t.token_id,
              data: key_val_pair
            }
          });
          break;
        case "bulkReplace":
          _revision.url_md5 = d.replaceOne.filter._id;
          _revision.created = d.replaceOne.replacement.modified;
          _revision.tokens = d.replaceOne.replacement.tokens.map(t => {
            let key_val_pair = {};
            t.data.forEach(_d => {
              key_val_pair[_d.key] = _d.value;
            });
            return {
              token_id: t.token_id,
              data: key_val_pair
            }
          });
          break;
      }
  
      // console.log(_revision);
      let updateOne = {
        "updateOne": {
          "filter": {_id: _revision.url_md5},
          "update": {
            "$push": {
              "revisions": {created: _revision.created, tokens: _revision.tokens}
            },
            "$setOnInsert": {
              _id: _revision.url_md5
            }
          },
          "upsert": true
        }
      }

      revisions.push(updateOne);

    });

    // console.log(JSON.stringify(revisions, null, 2));

    MultimediaAnnotations.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let MAR = db.collection("multimedia-annotation-revisions");
      console.log(MAR);

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

  MultimediaAnnotations.afterRemote("bulkInsert", addRevision);
  MultimediaAnnotations.afterRemote("bulkReplace", addRevision);
  MultimediaAnnotations.afterRemote("bulkUpdate", addRevision);
    
      
};
