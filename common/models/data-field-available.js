const CreateModel = require('./share/CreateModel');

module.exports = DataFieldAvailable => {
  const model = new CreateModel(DataFieldAvailable);

  model.router(
    {
      path: '/approved',
      verb: 'get',
    },
    require('./data-field-available/approved'),
  );
};
