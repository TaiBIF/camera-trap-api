'use strict';

var md5 = require('md5');
var uuid = require('uuid');

module.exports = function(MultimediaAnnotations) {

  MultimediaAnnotations.validatesInclusionOf('type', {in: ['StillImage', 'MovingImage']});

  MultimediaAnnotations.observe('before save', function(context, next) {

    // console.log(context.Model.definition.properties.tokens.default);

    if (!context.instance.url) {
      context.instance.url = uuid();
    }

    context.instance.url_md5 = md5(context.instance.url);
    
    next();
  });

};
