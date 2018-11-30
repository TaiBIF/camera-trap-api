// let strFunc = {};
// strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

module.exports = function(Model, options) {
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
    // Check login status, using
    // express-session + connect-redis combo middleware.
    // Sessions and cookies are handled automatically
    let argsData = context.args.data;
    if (!Array.isArray(argsData)) {
      argsData = [argsData];
    }

    let userInfo;
    if (context.req.session && context.req.session.user_info) {
      userInfo = context.req.session.user_info;
    } else if (
      context.req.headers['camera-trap-user-id'] &&
      context.req.headers['camera-trap-user-id-token']
    ) {
      // TODO: 只在測試環境使用，正式環境要把這兩個 headers 拿掉
      userInfo = {
        userId: context.req.headers['camera-trap-user-id'],
        idTokenHash: context.req.headers['camera-trap-user-id-token'],
      };
    } else {
      // user_info = {userId: "OrcID_0000-0002-7446-3249"}

      // sign in mechanism for lambda
      try {
        const base64string = context.req.headers.authorization
          .split('Basic ')
          .pop();
        const userPassword = Buffer.from(base64string, 'base64').toString();
        if (
          userPassword ===
          `${process.env.AWS_LAMBDA_AS_USER}:${
            process.env.PASSWD_AWS_LAMBDA_AS_USER
          }`
        ) {
          userInfo = { userId: context.req.headers['camera-trap-user-id'] };
        }
      } catch (e) {
        // console.log(e.message);
      }
    }

    const permissionDeniedMessages = [];

    if (userInfo) {
      // 成功從 session 中取得登入資訊
      const { userId } = userInfo;

      Model.getDataSource().connector.connect((err, db) => {
        if (err) {
          next(err);
          return;
        }

        const targetModelName = Model.definition.name;
        const remoteMethodName = context.methodString.split('.').pop();
        const CtpUsers = db.collection('CtpUser');

        const matchConditions = { _id: userId };
        if (userInfo.idTokenHash) {
          matchConditions.idTokenHash = userInfo.idTokenHash;
        }

        // 所有 remoteMethod 前都需要依據 remoteMethod, user id, target model, project id 檢查權限
        const userPermissionQuery = [
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
              userId: '$userId',
              name: '$name',
              projectId: '$project_roles.projectId',
              projectTitle: '$project_roles.projectTitle', // check-id-usage
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
                { 'permissions.projectId': { $ne: 'NA' } },
                { enabled: true },
              ],
            },
          },
          //* /
        ];

        CtpUsers.aggregate(userPermissionQuery, {}, (_err, results) => {
          if (_err) {
            next(_err);
          } else {
            results.toArray((__err, userPermissions) => {
              if (__err) {
                next(__err);
              } else {
                if (!userPermissions.length) {
                  next(permissionDenied('You are unauthorized.'));
                  return;
                }

                let projectValidated;
                if (
                  // eslint-disable-next-line
                  Model.definition.rawProperties.hasOwnProperty('projectId')
                ) {
                  projectValidated = true;
                  // 先檢查使用者有無權限鎖計畫範疇資料
                  argsData.forEach(q => {
                    // q for query
                    let permissionGranted = false;
                    userPermissions.forEach(p => {
                      // p for permission
                      // check-id-usage
                      if (
                        q.projectId === p.projectId ||
                        p.permissions.projectId === 'ANY'
                      ) {
                        permissionGranted = true;
                      }
                    });
                    projectValidated = projectValidated && permissionGranted;
                  });
                } else {
                  // no need to validate project
                  projectValidated = true;
                }
                // 基礎

                if (projectValidated) {
                  switch (targetModelName) {
                    // @todo change location to cameraLocation
                    case 'CameraLocationDataLock': {
                      const mdl = db.collection(targetModelName);
                      console.log(Model.app.get('env'));

                      // 再檢查資料是否已被他人鎖定
                      let go = true;
                      let goCounter = argsData.length;

                      argsData.forEach(q => {
                        // q for query
                        // 強制寫入 locked by
                        // eslint-disable-next-line
                        q.locked_by = userId;
                        // eslint-disable-next-line
                        q.locked_on = Date.now() / 1000;
                        // 雖然是 toArray 但這個 query 只會回傳單一結果
                        mdl
                          .find({ _id: q.fullCameraLocationMd5 })
                          .toArray((___err, dataLock) => {
                            goCounter -= 1;

                            if (
                              dataLock.length === 0 ||
                              (dataLock[0].locked &&
                                q.locked_by === dataLock[0].locked_by &&
                                q.projectId === dataLock[0].projectId) ||
                              (!dataLock[0].locked &&
                                q.projectId === dataLock[0].projectId)
                            ) {
                              // 如果 dataLock 不存在，或
                              // 資料處於鎖定狀態，鎖定者與使用者是同一個人，且未更動計畫名稱或
                              // 資料未鎖定，任何人皆可在未更動計畫名稱
                              // 等前提下，鎖定或解鎖資料
                            } else {
                              permissionDeniedMessages.push(
                                q.fullCameraLocationMd5,
                              );
                              go = false;
                            }

                            if (goCounter === 0) {
                              // bypass locaiton lock on development env
                              // TODO: remove bypass if not dev
                              if (
                                go ||
                                Model.app.get('env') === 'development'
                              ) {
                                next();
                              } else if (___err) {
                                next(___err);
                              } else {
                                next(
                                  permissionDenied(
                                    permissionDeniedMessages.join(','),
                                  ),
                                );
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
                      const uniqueLocationMd5Projects = {};

                      // 列出待鎖的 cameraLocations
                      argsData.forEach((d, idx, arr) => {
                        uniqueLocationMd5Projects[d.fullCameraLocationMd5] =
                          d.projectId;

                        // 就程序上不應該寫在這，但為求簡化流程，暫時把資料一致性寫在這
                        if (remoteMethodName === 'bulkUpdate') {
                          if (!!arr[idx].$set && !!arr[idx].$set.projectId) {
                            arr[idx].$set.projectId = d.projectId;
                            arr[idx].$set.fullCameraLocationMd5 =
                              d.fullCameraLocationMd5;
                          }

                          if (
                            !!arr[idx].$setOninsert &&
                            !!arr[idx].$setOnInsert.projectId
                          ) {
                            arr[idx].$setOnInsert.projectId = d.projectId;
                            arr[idx].$setOnInsert.fullCameraLocationMd5 =
                              d.fullCameraLocationMd5;
                          }
                          // 如果 $setOnInsert 裡有重複的 project 與 fullCameraLocationMd5，bulkNormalize 裡的機制會把它們清掉
                          // 最差的情況下是吐 error
                        }
                      });

                      // 就程序上不應該寫在這，但為求簡化流程，暫時把資料一致性寫在這
                      if (remoteMethodName === 'bulkUpdate') {
                        context.args.data = argsData;
                      }

                      const uniqueLocationMd5s = [];
                      /* eslint-disable */
                      for (const locId in uniqueLocationMd5Projects) {
                        if (uniqueLocationMd5Projects.hasOwnProperty(locId)) {
                          uniqueLocationMd5s.push({
                            locId,
                            projectId: uniqueLocationMd5Projects[locId],
                          });
                        }
                      }
                      /* eslint-enable */

                      // usage example:
                      const ldl = db.collection('CameraLocationDataLock');
                      let go = true;
                      let goCounter = uniqueLocationMd5s.length;

                      if (goCounter > 0) {
                        uniqueLocationMd5s.forEach(locPrj => {
                          // q for query
                          // 雖然是 toArray 但這個 query 只會回傳單一結果

                          //
                          ldl
                            .find({
                              _id: locPrj.locId,
                              // projectId: locPrj.projectId,
                              locked: true,
                              // eslint-disable-next-line
                              locked_by: userId,
                            })
                            .toArray((___err, dataLock) => {
                              if (dataLock.length === 0) {
                                permissionDeniedMessages.push(
                                  `Location data \`${
                                    locPrj.locId
                                  }\` is not locked by you.`,
                                );
                                go = false;
                              } else if (
                                dataLock[0].projectId !== locPrj.projectId
                              ) {
                                permissionDeniedMessages.push(
                                  `You have no permission to write data to \`${
                                    locPrj.locId
                                  }\` because it's from project \`${
                                    dataLock[0].projectId
                                  }\`.`,
                                );
                                go = false;
                              }

                              goCounter -= 1;

                              if (goCounter === 0) {
                                // bypass locaiton lock on development env
                                // TODO: remove bypass if not dev
                                if (
                                  go ||
                                  Model.app.get('env') === 'development'
                                ) {
                                  next();
                                } else if (___err) {
                                  next(___err);
                                } else {
                                  next(
                                    permissionDenied(
                                      permissionDeniedMessages.join(','),
                                    ),
                                  );
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
                } else {
                  // projectValidated is false
                  next(
                    permissionDenied(
                      'You have no right to write into this project.',
                    ),
                  );
                }
              }
            }); // end of results.forEach (function (userPermissions) {})
          } // collection.aggregate without error
        });
      });
      // end of if session exists
    } else {
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
