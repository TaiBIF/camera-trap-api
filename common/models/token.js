// const md5 = require('md5');

module.exports = function(Token) {
  Token.observe('before save', (context, next) => {
    console.log(context);
    // if (!context.instance.token_id) {
    // }

    next();
  });
};
