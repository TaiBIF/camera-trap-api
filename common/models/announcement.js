'use strict';

module.exports = function(Announcement) {

  // location locked by someone
  Announcement.remoteMethod (
    'getNotifications',
    {
        http: {path: '/notifications', verb: 'get'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
          { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Announcement.getNotifications = function (req, callback) {
    Announcement.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let user_id;

      try {
        user_id = req.session.user_info.user_id;
      }
      catch(e) {
        // 未登入，不用 throw error，後續僅顯示系統錯誤就好
      }

      // TODO: 只在測試環境使用，正式環境要把這個 headers 拿掉
      try {
        user_id = req.headers['camera-trap-user-id'] || 'OrcID_0000-0002-7446-3249';
      }
      catch(e) {
        // 未登入，不用 throw error，後續僅顯示系統錯誤就好
      }

      let allNotifications = [];

      // 取得所有人可見的系統公告
      function getSystemAnnouncements () {
        let mdl = db.collection('Announcement');
        mdl.find({}, {projection:{_id:1, message:1, level:1, created:1, modified:1}}).toArray(function(err, results){
          if (err) {
            callback(err);
          }
          else {
            results.forEach(function(el, idx, arr){
              arr[idx].collection = 'Announcement';
            });

            allNotifications = allNotifications.concat(results);
            // 如果使用者是登入狀態，取得使用者上傳紀錄
            if (user_id) {
              // call next function
              getUserRelatedUploads();
            }
            else {
              callback(null, allNotifications);
            }
          }
        });
      }

      // 取得使用者上傳紀錄
      function getUserRelatedUploads () {
        let mdl = db.collection('UploadSession');
        mdl.find({by: user_id}, {projection:{_id:1, projectTitle:1, site:1, subSite:1, cameraLocation:1, status:1, modified:1, created:1, earliestDataDate:1, latestDataDate:1}}).toArray(function(err, results){
          if (err) {
            callback(err)
          }
          else {

            results.forEach(function(el, idx, arr){
              arr[idx].level = (el.status == 'ERROR') ? 'WARNING' : 'INFO';
              arr[idx].message = el.projectTitle + " " + el.site + "-" + el.subSite + "<br/>" + el.cameraLocation + " " + el.earliestDataDate + "-" + el.latestDataDate;
              delete arr[idx].projectTitle;
              delete arr[idx].site;
              delete arr[idx].subSite;
              delete arr[idx].cameraLocation;
              delete arr[idx].earliestDataDate;
              delete arr[idx].latestDataDate;
              arr[idx].collection = 'UploadSession';
            });

            allNotifications = allNotifications.concat(results);
            // 取得與使用者管理計畫相關的異常回報資料
            getProjectAbnormalData();
          }
        });
      }

      // 取得與使用者管理計畫相關的異常回報資料
      function getProjectAbnormalData () {
        let mdl = db.collection('CtpUser');
        let roles = ["ProjectManager"];
        let aggregation_query = [
          {
            "$match": {
              "user_id": user_id,
              "project_roles.roles": {"$in": roles}
            }
          },
          {
            "$project": {
              "_id": false,
              "project_roles": "$project_roles"
            }
          },
          {
            "$unwind": "$project_roles"
          },
          {
            "$match": {
              "project_roles.roles": {"$in": roles}
            }
          },
          {
            "$lookup": {
              "from": "AbnormalData",
              "localField": "project_roles.projectTitle",
              "foreignField": "projectTitle",
              "as": "abnormalData"
            }
          },
          {
            "$project": {
              "abnormalData": "$abnormalData"
            }
          },
          {
            "$unwind": "$abnormalData"
          },
          {
            "$project": {
              "_id": "$abnormalData._id",
              "message": {"$concat":[
                "(使用者) 回報相機異常：", 
                "$abnormalData.abnormalType", 
                "<br/>", 
                "$abnormalData.projectTitle", " ",
                "$abnormalData.site", "-", "$abnormalData.subSite",
                "<br/>",
                "$abnormalData.cameraLocation", " ",
                "$abnormalData.abnormalStartDate", "-", "$abnormalData.abnormalEndDate"
              ]},
              "level": {"$literal": "WARNING"},
              "modified": "$abnormalData.modified",
              "created": "$abnormalData.created",
              "collection": {"$literal": "AbnormalData"}
            }
          }
          
        ];

        mdl.aggregate(aggregation_query, {}).toArray(function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            allNotifications = allNotifications.concat(results);
            // TODO: 欄位申請、問題回報、意見反饋
            allNotifications.sort((a,b) => {return (a.modified < b.modified)});
            callback(null, allNotifications);
          }
        });

      }

      function getAllNotifications () {
        getSystemAnnouncements()
      }

      getAllNotifications();
      


    });
  }
  
}