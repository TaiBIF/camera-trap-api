const CreateModel = require('../../server/share/CreateModel');

module.exports = Model => {
  const model = new CreateModel(Model);
  debugger;
  model.router(
    {
      path: '/overall',
      verb: 'get',
    },
    require('./forest-compartment-boundary/overall'),
  );
};
