'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();


// using redis. express-session and connect-redis combo to keep sign-in session
// redis can be replaced with AWS ElasticCache
var redis   = require("redis");
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var client  = redis.createClient();

app.use(session({
    secret: 'camera trap reveals secrets',
    name: 'ctp_session_id',
    store: new redisStore({ host: 'camera-trap-sessions.gsupl3.ng.0001.apne1.cache.amazonaws.com', port: 6379, client: client,ttl :  36000}), //10 hours, enough through my working hours
    saveUninitialized: false,
    resave: false
}));

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
