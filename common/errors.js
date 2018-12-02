exports.Http400 = class Http400 extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
};

exports.Http403 = class Http403 extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
};

exports.Http404 = class Http404 extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
};

exports.Http500 = class Http500 extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 500;
  }
};
