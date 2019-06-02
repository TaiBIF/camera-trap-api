const request = require('supertest');
const app = require('../src/web')();

before(() => {
  console.log('before all test');
});

describe('call /api/v1/', () => {
  it('should be 404', done => {
    request(app)
      .get('/api/v1')
      .set('Accept', 'application/json')
      .expect(404, done);
  });
});

after(() => {
  console.log('after all test');
  setTimeout(process.exit, 100);
});
