const atob = require('atob');

const AWS_REGION = 'ap-northeast-1';
const USER_POOL_ID = 'ap-northeast-1_R2iDn5W3B';
const AWS_ID_PROVIDER = `cognito-idp.ap-northeast-1.amazonaws.com/${USER_POOL_ID}`;
const IDENTITY_POOL_ID = 'ap-northeast-1:3d5edbfb-834c-4284-85f5-a4ec29d38ef0';

module.exports = function(CtpUsers) {
  CtpUsers.remoteMethod('signIn', {
    http: { path: '/sign-in', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  CtpUsers.signIn = function(data, req, callback) {
    console.log(data);
    console.log(req.http);

    const idToken = data.idToken;
    const AWS = CtpUsers.app.aws;
    const login = {};
    login[AWS_ID_PROVIDER] = idToken;

    AWS.config.update({ region: AWS_REGION });
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: login,
    });

    //*
    AWS.config.credentials.get(err => {
      if (err) {
        // console.log("Error", err);

        callback(err);
        throw err;
      } else {
        // 成功透過 OAuth 登入 AWS Cognito，取得 identity id
        //* 
        const idToken = AWS.config.credentials.params.Logins[AWS_ID_PROVIDER];
        const payload = idToken.split('.')[1];
        const tokenobj = JSON.parse(atob(payload));
        const user_id = tokenobj['cognito:username'];
        // let formatted = JSON.stringify(tokenobj, undefined, 2);
        // console.log(formatted);

        CtpUsers.getDataSource().connector.connect((err, db) => {
          if (err) {
            return callback(err);
          }
          const dateTime = Date.now() / 1000;
          const mdl = db.collection('CtpUser');
          mdl.updateOne(
            { _id: user_id },
            {
              $set: {
                modified: dateTime,
                idTokenHash: idToken,
              },
              $setOnInsert: {
                _id: user_id,
                user_id,
                name: tokenobj.name,
                email: '',
                created: dateTime,
                project_roles: [
                  {
                    projectTitle: 'ANY_NEW_TITLE',
                    roles: ['ProjectInitiator'],
                  },
                ],
              },
            },
            {
              upsert: true,
            },
          );
        });

        const user_info = {
          user_id,
          identity_id: AWS.config.credentials.identityId,
          name: tokenobj.name,
          idToken: tokenobj,
        };

        req.session.user_info = user_info;
        // let identity_id = AWS.config.credentials.identityId;
        console.log(req.session);
        console.log('Cognito Identity Id', user_id);
        //* /
        callback(null, user_id);
      }
    });
    //* /
  };

  CtpUsers.remoteMethod('whoAmI', {
    http: { path: '/me', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  CtpUsers.whoAmI = function(req, callback) {
    console.log(req.headers);

    let user_id;

    try {
      user_id = req.session.user_info.user_id;
    } catch (e) {
      callback(new Error('使用者未登入'));
    }

    // TODO: 只在測試環境使用，正式環境要把這個 headers 拿掉
    try {
      user_id = req.headers['camera-trap-user-id'];
    } catch (e) {
      callback(new Error('使用者未登入'));
    }

    CtpUsers.getDataSource().connector.connect((err, db) => {
      if (err) {
        return callback(err);
      }

      const mdl = db.collection('CtpUser');
      mdl.findOne(
        { _id: user_id },
        {
          projection: {
            idTokenHash: false,
            _id: false,
            id_token: false,
          },
        },
        (err, result) => {
          if (err) {
            return callback(err);
          }
          return callback(null, result);
        },
      );
    });
  };
};
