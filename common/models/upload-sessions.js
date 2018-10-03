'use strict';

let uuid = require('uuid');
module.exports = function(Uploadsessions) {

  Uploadsessions.beforeRemote('create', function( ctx, instance, next) {
    let id = uuid();
    ctx.args.data.upload_session_id = id;
    ctx.args.data.id = id;
    next();
  });

};
