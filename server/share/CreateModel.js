const _private = new WeakMap();

class CreateModel {
  constructor(model) {
    const _p = _private.set(this, {}).get(this);

    _p.model = model;
  }

  router({ path, verb = 'post' }, func) {
    const _p = _private.get(this);

    _p.model.remoteMethod(path, {
      http: { path, verb },
      accepts: [
        {
          arg: 'data',
          type: 'object',
          http: { source: 'body' },
        },
        {
          arg: 'req',
          type: 'object',
          http: { source: 'req' },
        },
      ],
      returns: { arg: 'ret', type: 'object' },
    });

    _p.model[path] = (data, req, res) => {
      _p.model.getDataSource().connector.connect((err, db) => {
        if (err) return res(err);

        func({ data, req, res, db });
      });
    };

    return this;
  }
}

module.exports = CreateModel;
