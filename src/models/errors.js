exports.Http400 = class Http400 extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.message = `${message || 'bad request'}`;
  }
};

exports.Http404 = class Http404 extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
    this.message = `${message || 'not found'}`;
  }
};

exports.Http500 = class Http500 extends Error {
  /*
  Server error.
   */
  constructor(message) {
    super(message);
    this.status = 500;
    this.message = `${message || 'server error'}`;
  }
};
