const CreateModel = require('../../server/share/CreateModel');

module.exports = Model => {
  const model = new CreateModel(Model);

  model
    .router(
      {
        path: '/overall',
        verb: 'get',
      },
      require('./forest-compartment-boundary/overall'),
    )
    .router(
      {
        path: '/regions',
        verb: 'post',
      },
      require('./forest-compartment-boundary/regions'),
    );
};
