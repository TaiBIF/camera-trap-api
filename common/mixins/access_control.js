let md5 = require('md5');
let strFunc = {};
strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

module.exports = function(Model, options) {
  'use strict';
  // console.log(Model.definition.rawProperties);


  let access_control = function (ctx, next) {
    // get user id and check login status, api needed
    next();
  }

  Model.observe('before save', access_control);

}

