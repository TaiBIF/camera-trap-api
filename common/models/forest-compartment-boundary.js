const CreateModel = require('./share/CreateModel');

module.exports = Model => {
  const model = new CreateModel(Model);

  model.router(
    {
      path: '/',
      verb: 'post',
    },
    require('./forest-compartment-boundary/match-coord'),
  );
  // .router(
  //   {
  //     path: '/regions',
  //     verb: 'post',
  //   },
  //   require('./forest-compartment-boundary/regions'),
  // );
};
