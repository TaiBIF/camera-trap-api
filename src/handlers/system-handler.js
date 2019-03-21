const config = require('config');
const queryString = require('query-string');

exports.getConfig = (req, res) => {
  /*
  GET /api/v1/config
  Return the config for frontend webapp.
   */
  res.json({
    languages: config.languages,
    oauthUrl: `${config.orcId.authorizeUrl}?${queryString.stringify({
      client_id: config.orcId.clientId,
      response_type: 'code',
      scope: '/authenticate',
      redirect_uri: `${config.apiServerUrl}/callback/orcid/authorization`,
    })}`,
  });
};
