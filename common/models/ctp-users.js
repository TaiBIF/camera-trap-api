'use strict';

let atob = require("atob");

module.exports = function(CtpUsers) {

  CtpUsers.remoteMethod (
    'getCredentials',
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

  CtpUsers.getCredentials = function (data, req, callback) {

    console.log(data);

    let region = 'ap-northeast-1';
    let idProvider = 'cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_JACElFd4C'; 
    let idToken = data.idToken;
    let AWS = CtpUsers.app.aws;
    let login = {};
    login[idProvider] = idToken;

    AWS.config.update({region: region});
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'ap-northeast-1:83570204-11bb-4601-8094-2dc2ccfbc88a',
      Logins: login
    });

    AWS.config.credentials.get(function(err){
      if (err) {
        // console.log("Error", err);
        callback(err);
      }
      else {
        // 成功透過 FB 登入 AWS Cognito，取得 identity id，不知道有沒有其他取得 identity id 的方法？
        let idToken = AWS.config.credentials.params.Logins[idProvider];
        let payload = idToken.split('.')[1];
        let tokenobj = JSON.parse(atob(payload));
        let user_id = tokenobj['cognito:username'];
		    //let formatted = JSON.stringify(tokenobj, undefined, 2);
        //console.log(formatted);

        let user_info = {
          user_id: user_id,
          identity_id: AWS.config.credentials.identityId,
          name: tokenobj['name'],
          idToken: tokenobj
        }

        req.session.user_info = user_info;
        //let identity_id = AWS.config.credentials.identityId;
        console.log("Cognito Identity Id", user_id);

        callback(null, user_id);
      }
    });
  }

};
