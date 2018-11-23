module.exports = function(Model, options) {
  // Model is the model class
  // options is an object containing the config properties from model definition
  Model.defineProperty('created', { type: 'number', required: true });
  Model.defineProperty('modified', { type: 'number', required: true });
};

module.exports = function(Model, options) {
  Model.observe('before save', (ctx, next) => {
    // Observe any insert/update event on Model
    const now = Date.now() / 1000;
    if (ctx.instance) {
      if (!ctx.instance.created) {
        ctx.instance.created = now;
      }
      ctx.instance.modified = now;
    } else {
      if (!ctx.data.created) {
        ctx.data.created = now;
      }
      ctx.data.modified = now;
    }
    next();
  });
};
