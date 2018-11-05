'use strict';

module.exports = function(Project) {

  Project.remoteMethod (
    'getUserRelatedProject',
    {
      http: {path: '/related-to-me', verb: 'post'},
      // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
      accepts: [
        {
          arg: 'data', type: 'object', http: {source: 'body'},
        },
        {
          arg: 'req', type: 'object', http: {source: 'req'},
        },
      ],
      returns: {arg: 'ret', type: 'object'},
    }
  );

  Project.getUserRelatedProject = (data, req, callback) => {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      // allowed: project, funder, projectStartDate, earliestRecordTimestamp, ...
      let sort_key = data.sort_key || "projectStartDate";
      sort_key = "project_metadata." + sort_key;

      // let pm = db.collection(Project.definition.name);
      let cu = db.collection("CtpUser");
      // TODO: remove data.user_id part from following line
      let user_id = data.user_id || req.session.user_info.user_id;

      let sorts = {};
      sorts[sort_key] = 1;

      // @todo naming change! project => title
      let aggregate_query = [
        {'$match': {"user_id": user_id}},
        {'$unwind': "$project_roles"},
        {'$group': {_id: "$project_roles.projectTitle"}},
        {
          '$lookup': {
            from: "Project",
            localField: "_id",
            foreignField: "_id",
            as: "project_metadata"
          }
        },
        {'$unwind': "$project_metadata"},
        {
          '$project': {
            "project_metadata": "$project_metadata"
          }
        },
        {
          "$sort": sorts
        }
      ];

      cu.aggregate(aggregate_query).toArray(function(err, prjs){
        callback(null, prjs);
      });

    });
  }

  /* remoteMethod: addUserToProject */
  Project.remoteMethod (
    'addUserToProject',
    {
        http: {path: '/add-user-to-project', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.addUserToProject = function (data, req, callback) {

    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      // let pm = db.collection(Project.definition.name);
      let cu = db.collection("CtpUser");
      //let user_id = req.session.user_info.user_id;

      let projectTitle = data.projectTitle;
      let user_to_add = data.user_id;
      let role = (!!data.role) ? data.role : "Member";

      cu.countDocuments({_id: user_to_add}, function(err, res) {

        if (err) {
          callback(err);
          return;
        }

        console.log(["user_exists", res]);
        if (res) { // 如果使用者存在
          cu.countDocuments({_id: user_to_add, "project_roles.projectTitle": projectTitle}, function(err, res) {
            console.log(res);
            let update, query;
            if (res == 0) {
              query = {_id: user_to_add};
              update = {
                '$addToSet': {
                  'project_roles': {
                    projectTitle: projectTitle,
                    roles: [ role ]
                  }
                }
              }
            }
            else {
              query = {
                "_id": user_to_add,
                "project_roles.projectTitle": projectTitle
              }
              update = {
                '$addToSet': {
                  'project_roles.$.roles': role
                }
              }
            }

            console.log(['test', query, update]);

            cu.updateOne (
              query, update, null,
              function(err, res) {
                if (err) {
                  callback(err);
                }
                else {
                  // console.log(res);
                  callback(null, res);
                }
              }
            );

          })
        }
        else {
          callback(new Error("User doesn't exist."));
        }
      });
    });
  }


  ///////////////////////////////////////////////

  Project.remoteMethod (
    'projectInit',
    {
      http: {path: '/init', verb: 'post'},
      // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
      accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } }
      ],
      returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.projectInit = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      // TODO: remove data.user_id part from following line
      let user_id = data.user_id || req.session.user_info.user_id;

      let mdl = db.collection("Project");
      let cu = db.collection("CtpUser");
      mdl.countDocuments({_id: data.projectTitle}, function(err, prj_cnt) {
        if (prj_cnt == 0) {
          cu.countDocuments({'project_roles.projectTitle': data.projectTitle}, function(err, mngr_cnt){
            if (mngr_cnt == 0) {
              cu.updateOne(
                {_id: user_id},
                {
                  '$addToSet': {
                    'project_roles': {
                      projectTitle: data.projectTitle,
                      roles: [ "ProjectManager" ]
                    }
                  }
                }, null,
                function(err, res){
                  callback(null, res);
                });
            }
          });
        }
      });
    });
  }

  ///////////////////////////////////////////////

  Project.remoteMethod (
    'getLocationMonthRetrievedNum',
    {
        http: {path: '/location-month-retrieved-num', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.getLocationMonthRetrievedNum = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let fullCameraLocationMd5 = data.fullCameraLocationMd5;
      let year = data.year;
      let site = data.site;
      let projectTitle = data.projectTitle;
      let to_match = {};

      if (fullCameraLocationMd5) {
        to_match['fullCameraLocationMd5'] = fullCameraLocationMd5;
      }

      if (site) {
        to_match['site'] = site;
      }

      if (year) {
        to_match['year'] = year;
      }
      else {
        return callback(new Error("請輸入年份"));
      }

      if (projectTitle) {
        to_match['projectTitle'] = projectTitle;
      }
      else {
        return callback(new Error("請輸入計畫名稱"));
      }

      let mmm = db.collection("MultimediaMetadata");
      let aggregate_query = [
        {
          "$match": to_match
        },
        {
          "$group":{
            "_id": {"fullCameraLocationMd5": "$fullCameraLocationMd5", "month": "$month"},
            "num": {
              "$sum": 1
            },
            "cameraLocation": {"$first": "$cameraLocation"},
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"}
          }
        },
        {
          "$group":{
            "_id": "$_id.fullCameraLocationMd5",
            "cameraLocation": {"$first": "$cameraLocation"},
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "monthly_num": {
              "$push": {
                "month": "$_id.month",
                "num": "$num"
              }
            }
          }
        }
      ];

      mmm.aggregate(aggregate_query).toArray(function(err, location_month_num) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, location_month_num);
        }
      });

    });
  }


  Project.remoteMethod (
    'getLocationMonthIdentifiedNum',
    {
        http: {path: '/location-month-identified-num', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.getLocationMonthIdentifiedNum = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let fullCameraLocationMd5 = data.fullCameraLocationMd5;
      let year = data.year;
      let site = data.site;
      let projectTitle = data.projectTitle;
      let to_match = {
        '$and': [
          {"tokens.species_shortcut": {$ne: "尚未辨識"}},
          {"tokens.species_shortcut": {$ne: ""}},
        ]
      };

      if (fullCameraLocationMd5) {
        to_match['fullCameraLocationMd5'] = fullCameraLocationMd5;
      }

      if (site) {
        to_match['site'] = site;
      }

      if (year) {
        to_match['year'] = year;
      }
      else {
        return callback(new Error("請輸入年份"));
      }

      if (projectTitle) {
        to_match['projectTitle'] = projectTitle;
      }
      else {
        return callback(new Error("請輸入計畫名稱"));
      }

      let mma = db.collection("MultimediaAnnotation");
      let aggregate_query = [
        {
          "$match": to_match
        },
        {
          "$group":{
            "_id": {"fullCameraLocationMd5": "$fullCameraLocationMd5", "month": "$month"},
            "num": {
              "$sum": 1
            },
            "cameraLocation": {"$first": "$cameraLocation"},
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"}
          }
        },
        {
          "$group":{
            "_id": "$_id.fullCameraLocationMd5",
            "cameraLocation": {"$first": "$cameraLocation"},
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "monthly_num": {
              "$push": {
                "month": "$_id.month",
                "num": "$num"
              }
            }
          }
        }
      ];

      mma.aggregate(aggregate_query).toArray(function(err, location_month_num) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, location_month_num);
        }
      });

    });
  }

};
