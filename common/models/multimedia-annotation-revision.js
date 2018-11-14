'use strict';

module.exports = function(MultimediaAnnotationRevision) {
  MultimediaAnnotationRevision.remoteMethod (
    'restoreRevision',
    {
        http: {path: '/restore', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  MultimediaAnnotationRevision.restoreRevision = function (data, req, callback) {
    MultimediaAnnotationRevision.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);
 

      let url_md5 = data.url_md5;
      let revision_tokens = data.revision_tokens;

      let mdl = db.collection("MultimediaAnnotation");
 
      mdl.findOne({"_id": url_md5}, function(err, mma) {
        if (err) {
          callback(err);
        }
        else {
          if (mma !== null) {
            let common_tokens_length = Math.min(mma.tokens.length, revision_tokens.length);
            if (common_tokens_length > 0) {
              for (let i=0; i<common_tokens_length; i++) {
                mma.tokens[i].data = revision_tokens[i].data;
              }
              mdl.replaceOne({"_id": url_md5}, mma, function(err, results){
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, results);
                }
              });
            }
            else {
              callback(null, results);
            }
          }
          else {
            callback(null, mma);
          }
        }
      });

    });
  }
}