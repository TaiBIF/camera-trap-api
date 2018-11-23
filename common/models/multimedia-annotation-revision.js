module.exports = function(MultimediaAnnotationRevision) {
  MultimediaAnnotationRevision.remoteMethod('restoreRevision', {
    http: { path: '/restore', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  MultimediaAnnotationRevision.restoreRevision = function(data, req, callback) {
    MultimediaAnnotationRevision.getDataSource().connector.connect(
      (err, db) => {
        if (err) return callback(err);

        // eslint-disable-next-line camelcase
        const { url_md5, revision_tokens } = data;

        const mdl = db.collection('MultimediaAnnotation');

        mdl.findOne({ _id: url_md5 }, (_err, mma) => {
          if (_err) {
            callback(_err);
          } else if (mma !== null) {
            const commonTokensLen = Math.min(
              mma.tokens.length,
              revision_tokens.length,
            );
            if (commonTokensLen > 0) {
              for (let i = 0; i < commonTokensLen; i += 1) {
                mma.tokens[i].data = revision_tokens[i].data;
              }
              mdl.replaceOne({ _id: url_md5 }, mma, (__err, results) => {
                if (__err) {
                  callback(__err);
                } else {
                  callback(null, results);
                }
              });
            } else {
              callback(null);
            }
          } else {
            callback(null, mma);
          }
        });
      },
    );
  };
};
