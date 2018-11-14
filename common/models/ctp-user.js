'use strict';

let atob = require("atob");
const AWS_REGION = 'ap-northeast-1';
const USER_POOL_ID = 'ap-northeast-1_R2iDn5W3B';
const AWS_ID_PROVIDER = 'cognito-idp.ap-northeast-1.amazonaws.com/' + USER_POOL_ID; 
const IDENTITY_POOL_ID = 'ap-northeast-1:3d5edbfb-834c-4284-85f5-a4ec29d38ef0';

module.exports = function(CtpUsers) {

  CtpUsers.remoteMethod (
    'signIn',
    {
      http: {path: '/sign-in', verb: 'post'},
      // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
      accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
      ],
      returns: { arg: 'ret', type: 'object' }
    }
  );

  CtpUsers.signIn = function (data, req, callback) {

    console.log(data);
    console.log(req.http);

    let idToken = data.idToken;
    let AWS = CtpUsers.app.aws;
    let login = {};
    login[AWS_ID_PROVIDER] = idToken;

    AWS.config.update({region: AWS_REGION});
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: login
    });

    //*
    AWS.config.credentials.get(function(err){
      if (err) {
        // console.log("Error", err);
        
        callback(err);
        throw(err);
      }
      else {
        // 成功透過 OAuth 登入 AWS Cognito，取得 identity id
        //*
        let idToken = AWS.config.credentials.params.Logins[AWS_ID_PROVIDER];
        let payload = idToken.split('.')[1];
        let tokenobj = JSON.parse(atob(payload));
        let user_id = tokenobj['cognito:username'];
		    //let formatted = JSON.stringify(tokenobj, undefined, 2);
        //console.log(formatted);

        CtpUsers.getDataSource().connector.connect(function(err, db) {
          if (err) {
            return callback(err);
          }
          let dateTime = Date.now() / 1000;
          let mdl = db.collection("CtpUser");
          mdl.updateOne(
            {_id: user_id},
            {
              $set: {
                modified: dateTime,
                idTokenHash: idToken
              },
              $setOnInsert: {
                _id: user_id,
                user_id: user_id,
                name: tokenobj.name,
                email: "",
                created: dateTime,
                project_roles: [
                  {
                    projectTitle: 'ANY_NEW_TITLE', roles: ['ProjectInitiator']
                  }
                ]
              }
            },
            {
              upsert: true
            }
          )
        });

        let user_info = {
          user_id: user_id,
          identity_id: AWS.config.credentials.identityId,
          name: tokenobj['name'],
          idToken: tokenobj
        }

        req.session.user_info = user_info;
        //let identity_id = AWS.config.credentials.identityId;
        console.log(req.session);
        console.log("Cognito Identity Id", user_id);
        //*/
        callback(null, user_id);
      }
    });

    //*/
  }

};
