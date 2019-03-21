const config = require('config');
const got = require('got');
const authentication = require('../auth/authentication');

exports.orcidAuthorization = (req, res) =>
  /*
  POST /callback/orcid/authorization
   */
  got({
    method: 'POST',
    url: config.orcId.tokenUrl,
    form: true,
    body: {
      client_id: config.orcId.clientId,
      client_secret: config.orcId.clientSecret,
      grant_type: 'authorization_code',
      code: req.query.code,
    },
  })
    .then(response => {
      const body = JSON.parse(response.body);
      return authentication.orcid(body);
    })
    .then(user => {
      req.session.userId = user._id;
      res.redirect(config.webAppUrl);
    });
