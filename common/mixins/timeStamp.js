module.exports = function(Model, options) {
  // Model is the model class
  // options is an object containing the config properties from model definition
  Model.defineProperty('created', {type: "number", required: true});
  Model.defineProperty('modified', {type: "number", required: true});
}

module.exports = function(Model, options) {
  'use strict';
  Model.observe('before save', function event(ctx, next) { //Observe any insert/update event on Model
    let now_ts = Date.now() / 1000;
    if (ctx.instance) {
      if (!ctx.instance.created) {
        ctx.instance.created = now_ts;
      }
      ctx.instance.modified = now_ts;
    }
    else {
      if (!ctx.data.created) {
        ctx.data.created = now_ts;
      }
      ctx.data.modified = now_ts;
    }
    next();
  });
};
