const url = require('url');
const atob = require('atob');
const AWS = require('aws-sdk');
// const errors = require('../errors');

const AWS_REGION = 'ap-northeast-1';
const USER_POOL_ID = 'ap-northeast-1_R2iDn5W3B';
// eslint-disable-next-line max-len
const AWS_ID_PROVIDER = `cognito-idp.ap-northeast-1.amazonaws.com/${USER_POOL_ID}`;
const IDENTITY_POOL_ID = 'ap-northeast-1:3d5edbfb-834c-4284-85f5-a4ec29d38ef0';
const LOGIN_REDIRECT_HOSTNAME_WHITE_LIST = [
  'localhost',
  'dev.camera-trap.tw',
  'camera-trap.tw',
];

const CreateModel = require('./share/CreateModel');

module.exports = function(CtpUsers) {
  const model = new CreateModel(CtpUsers);

  model
    .router(
      {
        path: '/me',
        verb: 'get',
      },
      require('./ctp-user/me'),
    )
    .router(
      {
        path: '/me/update',
        verb: 'patch',
      },
      require('./ctp-user/me-update'),
    );

  CtpUsers.remoteMethod('signIn', {
    http: { path: '/sign-in', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'res', type: 'object', http: { source: 'res' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  CtpUsers.signIn = function(data, req, res, callback) {
    const { idToken, redirect } = data;

    AWS.config.update({ region: AWS_REGION });
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: (() => {
        const result = {};
        result[AWS_ID_PROVIDER] = idToken;
        return result;
      })(),
    });

    AWS.config.credentials.get(err => {
      if (err) {
        return callback(err);
      }
      // 成功透過 OAuth 登入 AWS Cognito，取得 identity id
      const idT = AWS.config.credentials.params.Logins[AWS_ID_PROVIDER];
      const payload = idT.split('.')[1];
      const tokenobj = JSON.parse(atob(payload));
      const userId = tokenobj['cognito:username'];

      CtpUsers.getDataSource().connector.connect((_err, db) => {
        if (_err) {
          return callback(_err);
        }
        const dateTime = Date.now() / 1000;
        db.collection('CtpUser')
          .updateOne(
            { _id: userId },
            {
              $set: {
                modified: dateTime,
                idTokenHash: idT,
              },
              $setOnInsert: {
                _id: userId,
                // eslint-disable-next-line camelcase
                userId,
                name: tokenobj.name,
                email: '',
                created: dateTime,
                // eslint-disable-next-line camelcase
                project_roles: [
                  {
                    projectId: 'ANY_NEW',
                    projectTitle: 'ANY_NEW',
                    role: 'ProjectInitiator',
                  },
                ],
              },
            },
            {
              upsert: true,
            },
          )
          .then(() => {
            const userInfo = {
              userId,
              // eslint-disable-next-line camelcase
              identity_id: AWS.config.credentials.identityId,
              name: tokenobj.name,
              idToken: tokenobj,
            };
            // eslint-disable-next-line camelcase
            req.session.user_info = userInfo;
            const redirectUrl = url.parse(redirect);
            if (
              LOGIN_REDIRECT_HOSTNAME_WHITE_LIST.indexOf(
                redirectUrl.hostname,
              ) >= 0
            ) {
              return res.redirect(redirect);
            }
            callback(null, userId);
          })
          .catch(error => {
            callback(error);
          });
      });
    });
  };

  CtpUsers.remoteMethod('signOut', {
    http: { path: '/sign-out', verb: 'post' },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });
  CtpUsers.signOut = function(req, callback) {
    delete req.session.user_info;
    callback(null, {});
  };
};
