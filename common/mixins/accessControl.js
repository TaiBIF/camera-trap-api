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

        //let identity_id = AWS.config.credentials.identityId;
        console.log("Cognito Identity Id", user_id);
        
        callback(null, user_id);
      }
    });
  }

  let checkPermissions = function(context, user, next) {
    // get user id and check login status, api needed
    // console.log(context);
    let AWS = Model.app.aws;
    let PermissionDeniedErr = new Error();
    PermissionDeniedErr.message = "Permission denied.";

    AWS.config.credentials.get(function (err) {
      if (err) {
        // console.log("Error", err);
        next(err);
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

        // console.log("Cognito Identity Id", AWS.config.credentials.identityId);
        console.log("Cognito Identity Id", user_id);

        Model.getDataSource().connector.connect(function(err, db) {

          if (err) { next(err); return; }

          let targetModelName = Model.definition.name;
          let remoteMethodName = context.methodString.split(".").pop();
          let CtpUsers = db.collection("CtpUsers");

          // 所有 remoteMethod 前都需要依據 remoteMethod, user id, target model, project name 檢查權限
          CtpUsers.aggregate(
            [
              { '$match': { _id: user_id } },
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
                    {'enabled': true}
                  ]
                }
              }
              //*/
            ], {}, function(err, results){
              if (err) {
                next(err);
              }
              else {
                results.toArray(function(err, userPermissions) {
                  if (err) { next(err); return;}
                  else {
                    console.log(JSON.stringify(userPermissions, null, 2));
                    if (!userPermissions.length) { next(PermissionDeniedErr); return; }

                    let projectValidated;
                    if (Model.definition.rawProperties.hasOwnProperty('project')) {
                      projectValidated = true;
                      // 先檢查使用者有無權限鎖計畫範疇資料
                      context.args.data.forEach(function(q){ // q for query
                        let permission_granted = false;
                        userPermissions.forEach(function(p){ // p for permission
                          if (q.project === p.project || p.permissions.project === 'ANY') {
                            permission_granted = true;
                          }
                        });
                        projectValidated = projectValidated && permission_granted; 
                      });
                    }
                    else { // no need to validate project
                      projectValidated = true;
                    }
                    console.log(projectValidated);

                    if (projectValidated) {
                      switch (targetModelName) {
                        case "LocationDataLock":
                          let mdl = db.collection(targetModelName);

                          // 再檢查資料是否已被他人鎖定
                          let go = true;
                          let go_counter = context.args.data.length;
                          context.args.data.forEach(function(q){ // q for query
                            // 強制寫入 locked by
                            q.locked_by = user_id;
                            // 雖然是 toArray 但這個 query 只會回傳單一結果
                            mdl.find({_id: q.full_location_md5}).toArray(function(err, dataLock) {
                              console.log([user_id, dataLock]);
                              go_counter = go_counter - 1;

                              if (
                                (dataLock.length === 0) ||
                                (dataLock[0].locked && (q.locked_by === dataLock[0].locked_by) && (q.project === dataLock[0].project)) ||
                                (!dataLock[0].locked && (q.project === dataLock[0].project))
                              ) {
                                // 如果 dataLock 不存在，或
                                // 資料處於鎖定狀態，鎖定者與使用者是同一個人，且未更動計畫名稱或
                                // 資料未鎖定，任何人皆可在未更動計畫名稱
                                // 等前提下，鎖定或解鎖資料
                              }
                              else {
                                console.log("Don't go!");
                                go = false;
                              }

                              if (go_counter === 0) {
                                if (go) {
                                  next();
                                }
                                else {
                                  if (err) {
                                    next(err);
                                  }
                                  else {
                                    next(PermissionDeniedErr);
                                  }
                                }
                              }
                            });
                          });



                          break;
                        default:
                          next();
                          break;
                      }
                    }
                    else { // projectValidated is false
                      //PermissionDeniedErr.message = "You"
                      next(PermissionDeniedErr);
                    }
                  }
                }); // end of results.forEach (function (userPermissions) {})
              } // collection.aggregate without error
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

