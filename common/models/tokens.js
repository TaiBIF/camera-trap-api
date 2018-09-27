'use strict';

var md5 = require('md5');

module.exports = function(Tokens) {

  Tokens.observe('before save', function(context, next) {
    console.log(context);
    if (!context.instance.token_id) {
    
    }
    
    next();
  });

};
