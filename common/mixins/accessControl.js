let md5 = require('md5');
let atob = require('atob');
let strFunc = {};
strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

let region = 'ap-northeast-1';
let idProvider = 'cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_JACElFd4C'; 

module.exports = function(Model, options) {
  'use strict';
  // console.log(Model.definition.rawProperties);


  Model.remoteMethod (
    'getCredentials',
    {
      http: {path: '/getCredentials', verb: 'post'},
      // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'ret', type: 'object' }
    }
  );

  Model.getCredentials = function (data, callback) {

    let idToken = data.idToken;
    let AWS = Model.app.aws;
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

        let identity_id = AWS.config.credentials.identityId;
        console.log("Cognito Identity Id", AWS.config.credentials.identityId);
        
        callback(null, identity_id);
      }
    });
  }


  let checkPermissions = function(context, user, next) {
    // get user id and check login status, api needed
    // console.log(context);
    let AWS = Model.app.aws;
    AWS.config.credentials.get(function (err) {
      if (err) {
        // console.log("Error", err);
        AWS.config.credentials.refresh(function (err) {
          if (err) {
            console.log("Refresh failed.");
            next(err);
          }
          else {
            next();
          }
        })
      }
      else {
        // 成功透過 FB 登入 AWS Cognito，取得 identity id，不知道有沒有其他取得 identity id 的方法？
        // console.log(AWS.config.credentials);
        let idToken = AWS.config.credentials.params.Logins[idProvider];
        let payload = idToken.split('.')[1];
        let tokenobj = JSON.parse(atob(payload));

        let user_id = tokenobj['cognito:username'];
		    // let formatted = JSON.stringify(tokenobj, undefined, 2);
        // console.log(formatted);

        let identity_id = AWS.config.credentials.identityId;
        console.log("Cognito Identity Id", AWS.config.credentials.identityId);

        Model.getDataSource().connector.connect(function(err, db) {

          if (err) {

            next(err);
            return;
          }

          let targetModelName = Model.definition.name;
          let remoteMethodName = context.methodString.split(".").pop();
          let RolePermissions = db.collection("RolePermissions");
          let CtpUsers = db.collection("CtpUsers");

          // 所有 remoteMethod 前都需要依據 remoteMethod, user id, target model, project name 檢查權限
          CtpUsers.aggregate(
            [
              {
                '$match': {
                  user_id: user_id
                }
              },
              {'$unwind': '$project_roles'},
              {'$unwind': '$project_roles.roles'},
              {
                '$lookup': {
                  from: "RolePermissions",
                  localField: "project_roles.roles",
                  foreignField: "role",
                  as: "role_details"
                }
              },
              {'$unwind': {
                path: '$role_details',
                preserveNullAndEmptyArrays: true
              }},
              {'$unwind': {
                path: '$role_details.permissions',
                preserveNullAndEmptyArrays: true
              }},
              {
                '$project': {
                  user_id: '$user_id',
                  name: '$name',
                  project: '$project_roles.project',
                  role: '$role_details.role',
                  permissions: '$role_details.permissions',
                  enabled: '$role_details.enabled'
                }
              },
              {
                '$match': {
                  '$and': [
                    {
                      '$or': [
                        {'permissions.remoteMethod': "ANY"},
                        {'permissions.remoteMethod': remoteMethodName}
                      ]
                    },
                    {
                      '$or': [
                        {'permissions.collection': "ANY"},
                        {'permissions.collection': targetModelName}
                      ]
                    },
                    {'permissions.project': {"$ne" : "NA"}},
                    {'permissions.enabled': true}
                  ]
                }
              }
              //*/
            ], {}, function(err, results){
              if (err) {
                next(err);
              }
              else {
                results.toArray(function(err, data) {
                  if (err) {
                    next(err);
                  }
                  else {
                    console.log(JSON.stringify(data, null, 2));
                    next();
                  }
                })
              }
            });
          /* 
          寫入 multimedia annotaiton/medatata 前尚需檢查 location lock 的問題
          TODO: location 應該已上鎖 by user
          1. 檢查待寫入的資料包括哪些 location, 但如何得知? => TODO: 每筆待更新資料內含 location 資訊
          2. 檢查資料鎖定表, query location with user id (完全成立才放行) 
          
          //*/
          // next();
        });

      }
    });
  }

  // Model.beforeRemote("bulk*", checkPermissions);
  Model.beforeRemote("bulkReplace", checkPermissions);
  
}

