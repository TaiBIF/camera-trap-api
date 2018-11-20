// let strFunc = {};
// strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

module.exports = function(Model, options) {
  // console.log(Model.definition.rawProperties);

  /*
  let onlyUnique = function (value, index, self) {
    return self.indexOf(value) === index;
  }
  // */

  const permissionDenied = function(message) {
    const PermissionDeniedErr = new Error();
    PermissionDeniedErr.message = 'Permission denied.';

    if (message) {
      PermissionDeniedErr.message = `${
        PermissionDeniedErr.message
      }: ${message}`;
    }
    return PermissionDeniedErr;
  };

  const checkPermissions = function(context, user, next) {
    console.log(['context.req.headers', context.req.headers]);

    // Check login status, using
    // express-session + connect-redis combo middleware.
    // Sessions and cookies are handled automatically
    // console.log(context.req.session.user_info);
    let args_data = context.args.data;
    if (!Array.isArray(args_data)) {
      args_data = [args_data];
    }

    let user_info;
    if (context.req.session && context.req.session.user_info) {
      console.log([
        'context.req.session.user_info',
        context.req.session.user_info,
      ]);
      user_info = context.req.session.user_info;
    } else if (
      context.req.headers['camera-trap-user-id'] &&
      context.req.headers['camera-trap-user-id-token']
    ) {
      // TODO: 只在測試環境使用，正式環境要把這兩個 headers 拿掉
      user_info = {
        user_id: context.req.headers['camera-trap-user-id'],
        idTokenHash: context.req.headers['camera-trap-user-id-token'],
      };
    } else {
      // user_info = {user_id: "OrcID_0000-0002-7446-3249"}
      // console.log(['made.up', user_info]);
      // console.log(context.req.headers);

      // sign in mechanism for lambda
      try {
        const base64string = context.req.headers.authorization
          .split('Basic ')
          .pop();
        const user_password = Buffer.from(base64string, 'base64').toString();
        if (
          user_password ==
          `${process.env.AWS_LAMBDA_AS_USER}:${
            process.env.PASSWD_AWS_LAMBDA_AS_USER
          }`
        ) {
          user_info = { user_id: context.req.headers['camera-trap-user-id'] };
        }
        // console.log(user_password);
      } catch (e) {
        console.log(e.message);
      }
    }

    const permission_denied_messages = [];

    if (user_info) {
      // 成功從 session 中取得登入資訊
      const user_id = user_info.user_id;

      console.log('User Id', user_id);

      Model.getDataSource().connector.connect((err, db) => {
        if (err) {
          next(err);
          return;
        }

        const targetModelName = Model.definition.name;
        const remoteMethodName = context.methodString.split('.').pop();
        const CtpUsers = db.collection('CtpUser');

        const matchConditions = { _id: user_id };
        if (user_info.idTokenHash) {
          matchConditions.idTokenHash = user_info.idTokenHash;
        }

        // 所有 remoteMethod 前都需要依據 remoteMethod, user id, target model, project name 檢查權限
        const user_permission_query = [
          { $match: matchConditions },
          { $unwind: '$project_roles' },
          { $unwind: '$project_roles.roles' },
          {
            $lookup: {
              from: 'RolePermission',
              localField: 'project_roles.roles',
              foreignField: 'role',
              as: 'role_details',
            },
          },
          {
            $unwind: {
              path: '$role_details',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: '$role_details.permissions',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              user_id: '$user_id',
              name: '$name',
              projectTitle: '$project_roles.projectTitle',
              role: '$role_details.role',
              permissions: '$role_details.permissions',
              enabled: '$role_details.enabled',
            },
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    { 'permissions.remoteMethod': 'ANY' },
                    { 'permissions.remoteMethod': remoteMethodName },
                  ],
                },
                {
                  $or: [
                    { 'permissions.collection': 'ANY' },
                    { 'permissions.collection': targetModelName },
                  ],
                },
                { 'permissions.projectTitle': { $ne: 'NA' } },
                { enabled: true },
              ],
            },
          },
          //* /
        ];

        console.log(user_permission_query);

        CtpUsers.aggregate(user_permission_query, {}, (err, results) => {
          if (err) {
            next(err);
          } else {
            results.toArray((err, userPermissions) => {
              if (err) { next(err); } else {
                console.log(JSON.stringify(userPermissions, null, 2));
                if (!userPermissions.length) { next(permissionDenied('You are unauthorized.')); return; }

                let projectValidated;
                if (Model.definition.rawProperties.hasOwnProperty('projectTitle')) {
                  projectValidated = true;
                  // 先檢查使用者有無權限鎖計畫範疇資料
                  args_data.forEach((q) => { // q for query
                      let permission_granted = false;
                      userPermissions.forEach(function(p){ // p for permission
                        if (q.projectTitle === p.projectTitle || p.permissions.projectTitle === 'ANY') {
                          permission_granted = true;
                        }
                      });
                      projectValidated = projectValidated && permission_granted;
                    });
                } else { // no need to validate project
                  projectValidated = true;
                }
                console.log(projectValidated);

                // 基礎

                if (projectValidated) {
                  switch (targetModelName) {
                    // @todo change location to cameraLocation
                    case 'CameraLocationDataLock': {
                      let mdl = db.collection(targetModelName);

                      // 再檢查資料是否已被他人鎖定
                      let go = true;
                      let go_counter = args_data.length;

                      args_data.forEach((q) => { // q for query
                          // 強制寫入 locked by
                          q.locked_by = user_id;
                          q.locked_on = Date.now() / 1000;
                          // 雖然是 toArray 但這個 query 只會回傳單一結果
                          mdl.find({_id: q.fullCameraLocationMd5}).toArray(function(err, dataLock) {
                            console.log([user_id, dataLock]);
                            go_counter = go_counter - 1;

                            if (
                              (dataLock.length === 0) ||
                              (dataLock[0].locked && (q.locked_by === dataLock[0].locked_by) && (q.projectTitle === dataLock[0].projectTitle)) ||
                              (!dataLock[0].locked && (q.projectTitle === dataLock[0].projectTitle))
                            ) {
                              // 如果 dataLock 不存在，或
                              // 資料處於鎖定狀態，鎖定者與使用者是同一個人，且未更動計畫名稱或
                              // 資料未鎖定，任何人皆可在未更動計畫名稱
                              // 等前提下，鎖定或解鎖資料
                            }
                            else {
                              console.log("Don't go!");
                              permission_denied_messages.push(q.fullCameraLocationMd5);
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
                                  next(permissionDenied(permission_denied_messages.join(",")));
                                }
                              }
                            }
                          });
                        });
                      break; // end of LocationDataLock logic
                    }
                    case 'MultimediaAnnotation':
                    case 'MultimediaMetadata': {
                      /*
                        寫入 multimedia annotaiton/medatata 前尚需檢查 cameraLocation lock 的問題
                        TODO: cameraLocation 應該已上鎖 by user
                        1. 檢查待寫入的資料包括哪些 cameraLocation, 但如何得知? => TODO: 每筆待更新資料內含 cameraLocation 資訊
                        2. 檢查資料鎖定表, query cameraLocation with user id (完全成立才放行)
                        // */
                      let uniqueLocationMd5Projects = {};

                      // 列出待鎖的 cameraLocations
                      args_data.forEach((d, idx, arr) => {
                          uniqueLocationMd5Projects[d.fullCameraLocationMd5] = d.projectTitle;

                          // 就程序上不應該寫在這，但為求簡化流程，暫時把資料一致性寫在這
                          if (remoteMethodName == "bulkUpdate") {
                            if (!!arr[idx]['$set'] && !!arr[idx]['$set']['projectTitle']) {
                              arr[idx]['$set']['projectTitle'] = d.projectTitle;
                              arr[idx]['$set']['fullCameraLocationMd5'] = d.fullCameraLocationMd5;
                            }

                            if (!!arr[idx]['$setOninsert'] && !!arr[idx]['$setOnInsert']['projectTitle']) {
                              arr[idx]['$setOnInsert']['projectTitle'] = d.projectTitle;
                              arr[idx]['$setOnInsert']['fullCameraLocationMd5'] = d.fullCameraLocationMd5;
                            }
                            // 如果 $setOnInsert 裡有重複的 project 與 fullCameraLocationMd5，bulkNormalize 裡的機制會把它們清掉
                            // 最差的情況下是吐 error
                          }
                        });

                      // 就程序上不應該寫在這，但為求簡化流程，暫時把資料一致性寫在這
                      if (remoteMethodName == 'bulkUpdate') {
                        context.args.data = args_data;
                      }

                      let uniqueLocationMd5s = [];
                      for (const loc_id in uniqueLocationMd5Projects) {
                        if (uniqueLocationMd5Projects.hasOwnProperty(loc_id)) {
                          uniqueLocationMd5s.push({loc_id, projectTitle: uniqueLocationMd5Projects[loc_id]});
                        }
                      }

                      // usage example:
                      console.log(uniqueLocationMd5s);

                      let ldl = db.collection('CameraLocationDataLock');
                      let go = true;
                      let go_counter = uniqueLocationMd5s.length;

                      if (go_counter > 0) {
                        uniqueLocationMd5s.forEach((locPrj) => { // q for query
                            // 雖然是 toArray 但這個 query 只會回傳單一結果

                            //
                            ldl.find({
                              _id: locPrj.loc_id,
                              // projectTitle: locPrj.projectTitle,
                              locked: true,
                              locked_by: user_id
                            }).toArray(function(err, dataLock) {

                              if (dataLock.length === 0) {
                                permission_denied_messages.push("Location data `" + locPrj.loc_id + "` is not locked by you.");
                                go = false;
                              }
                              else if (dataLock[0].projectTitle !== locPrj.projectTitle) {
                                permission_denied_messages.push("You have no permission to write data to `" + locPrj.loc_id + "` because it's from `" + dataLock[0].projectTitle + "`.");
                                go = false;
                              }

                              go_counter = go_counter - 1;

                              if (go_counter === 0) {
                                if (go) {
                                  next();
                                }
                                else {
                                  if (err) {
                                    next(err);
                                  }
                                  else {
                                    next(permissionDenied(permission_denied_messages.join(",")));
                                  }
                                }
                              }

                            });

                        });
                      } else {
                        next();
                      }
                      break;
                      }
                    default:
                      next();
                      break;
                  }
                } else { // projectValidated is false
                  next(permissionDenied('You have no right to write into this project.'));
                }
              }
            }); // end of results.forEach (function (userPermissions) {})
          } // collection.aggregate without error
        });
      });
    } // end of if session exists
    else {
      next(permissionDenied('使用者未登入, 請先登入再執行此操作.'));
    }
  };

  // Model.beforeRemote("bulk*", checkPermissions);
  Model.beforeRemote('bulkInsert', checkPermissions);
  Model.beforeRemote('bulkReplace', checkPermissions);
  // bulkUpdate 的自由度高，要注意狀況
  Model.beforeRemote('bulkUpdate', checkPermissions);
  Model.beforeRemote('addUserToProject', checkPermissions);
  Model.beforeRemote('projectInit', checkPermissions);
};
