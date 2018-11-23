module.exports = function(Announcement) {
  // location locked by someone
  Announcement.remoteMethod('getNotifications', {
    http: { path: '/notifications', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  Announcement.getNotifications = function(req, callback) {
    Announcement.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      let userId;

      try {
        userId = req.session.user_info.user_id;
      } catch (e) {
        // 未登入，不用 throw error，後續僅顯示系統錯誤就好
      }

      // TODO: 只在測試環境使用，正式環境要把這個 headers 拿掉
      try {
        userId =
          req.headers['camera-trap-user-id'] || 'OrcID_0000-0002-7446-3249';
      } catch (e) {
        // 未登入，不用 throw error，後續僅顯示系統錯誤就好
      }

      let allNotifications = [];

      function getUserReports() {
        const userModel = db.collection('CtpUser');
        const reportModel = db.collection('UserReport');
        const roles = ['SysAdmin'];

        const query = {
          _id: userId,
          'project_roles.roles': {
            $in: roles,
          },
        };

        userModel.findOne(query, {}, (_err, result) => {
          console.log(['SysAdmin', result]);
          if (_err) {
            callback(_err);
          } else if (!result) {
            allNotifications.sort((a, b) => b.modified - a.modified);
            callback(null, allNotifications);
          } else {
            reportModel.find({}, { limit: 10 }).toArray((__err, results) => {
              if (__err) {
                callback(__err);
              } else {
                results.forEach((item, idx, arr) => {
                  arr[idx].message = `<${item.email}><br/>[${
                    item.reportType
                  }][${item.reportContentType}]<br/>${item.description}`;
                  if (item.reportType === '問題回報') {
                    arr[idx].status = 'WARNING';
                  } else {
                    arr[idx].status = 'INFO';
                  }
                  arr[idx].collection = 'UserReport';
                });

                allNotifications = allNotifications.concat(results);
                // TODO: 欄位申請
                allNotifications.sort((a, b) => b.modified - a.modified);
                callback(null, allNotifications);
              }
            });
          }
        });
      }

      // 取得所有人可見的系統公告
      function getSystemAnnouncements() {
        const mdl = db.collection('Announcement');
        mdl
          .find(
            {},
            {
              projection: {
                _id: 1,
                message: 1,
                level: 1,
                created: 1,
                modified: 1,
              },
            },
          )
          .toArray((_err, results) => {
            if (_err) {
              callback(_err);
            } else {
              results.forEach((el, idx, arr) => {
                arr[idx].collection = 'Announcement';
              });

              allNotifications = allNotifications.concat(results);
              // 如果使用者是登入狀態，取得使用者上傳紀錄
              if (userId) {
                // call next function
                // eslint-disable-next-line
                getUserRelatedUploads();
              } else {
                callback(null, allNotifications);
              }
            }
          });
      }

      // 取得與使用者管理計畫相關的異常回報資料
      function getProjectAbnormalData() {
        const mdl = db.collection('CtpUser');
        const roles = ['ProjectManager'];
        const aggregationQuery = [
          {
            $match: {
              // eslint-disable-next-line camelcase
              user_id: userId,
              'project_roles.roles': { $in: roles },
            },
          },
          {
            $project: {
              _id: false,
              // eslint-disable-next-line camelcase
              project_roles: '$project_roles',
            },
          },
          {
            $unwind: '$project_roles',
          },
          {
            $match: {
              'project_roles.roles': { $in: roles },
            },
          },
          {
            $lookup: {
              from: 'AbnormalData',
              localField: 'project_roles.projectTitle',
              foreignField: 'projectTitle',
              as: 'abnormalData',
            },
          },
          {
            $project: {
              abnormalData: '$abnormalData',
            },
          },
          {
            $unwind: '$abnormalData',
          },
          {
            $project: {
              _id: '$abnormalData._id',
              message: {
                $concat: [
                  '(使用者) 回報相機異常：',
                  '$abnormalData.abnormalType',
                  '<br/>',
                  '$abnormalData.projectTitle',
                  ' ',
                  '$abnormalData.site',
                  '-',
                  '$abnormalData.subSite',
                  '<br/>',
                  '$abnormalData.cameraLocation',
                  ' ',
                  '$abnormalData.abnormalStartDate',
                  '-',
                  '$abnormalData.abnormalEndDate',
                ],
              },
              level: { $literal: 'WARNING' },
              modified: '$abnormalData.modified',
              created: '$abnormalData.created',
              collection: { $literal: 'AbnormalData' },
            },
          },
        ];

        mdl.aggregate(aggregationQuery, {}).toArray((_err, results) => {
          if (_err) {
            callback(_err);
          } else {
            allNotifications = allNotifications.concat(results);
            getUserReports();
          }
        });
      }

      function getAllNotifications() {
        getSystemAnnouncements();
      }

      // 取得使用者上傳紀錄
      function getUserRelatedUploads() {
        const mdl = db.collection('UploadSession');
        mdl
          .find(
            { by: userId },
            {
              projection: {
                _id: 1,
                projectTitle: 1,
                site: 1,
                subSite: 1,
                cameraLocation: 1,
                status: 1,
                modified: 1,
                created: 1,
                earliestDataDate: 1,
                latestDataDate: 1,
              },
            },
          )
          .toArray((_err, results) => {
            if (_err) {
              callback(_err);
            } else {
              results.forEach((el, idx, arr) => {
                arr[idx].level = el.status === 'ERROR' ? 'WARNING' : 'INFO';
                arr[idx].message = `${el.projectTitle} ${el.site}-${
                  el.subSite
                }<br/>${el.cameraLocation} ${el.earliestDataDate}-${
                  el.latestDataDate
                }`;
                arr[idx].collection = 'UploadSession';
              });

              allNotifications = allNotifications.concat(results);
              // 取得與使用者管理計畫相關的異常回報資料
              getProjectAbnormalData();
            }
          });
      }

      getAllNotifications();
    });
  };
};
