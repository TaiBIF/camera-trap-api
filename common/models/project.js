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
          cu.find({'project_roles.projectTitle': data.projectTitle, 'project_roles.roles': "ProjectManager"}, {projection: {_id: true}}).toArray(function(err, mngrs){
            if (mngrs.length == 0) {
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
            else {
              let pms = [];
              mngrs.forEach(mngr => {
                pms.push(mngr._id);
              });
              callback(new Error("計畫 `" + data.projectTitle + "` 已被`" + pms.join('`, `') + "`註冊."));
            }
          });
        }
        else {
          callback(new Error("計畫 `" + data.projectTitle + "` 已經存在."));
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
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"}
          }
        },
        {
          "$group":{
            "_id": "$_id.fullCameraLocationMd5",
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"},
            "monthly_num": {
              "$push": {
                "month": "$_id.month",
                "num": "$num"
              }
            }
          }
        },
        {
          "$lookup": {
            from: "Project",
            localField: "_id",
            foreignField: "cameraLocations.fullCameraLocationMd5",
            as: "cameraLocationMeta"
          }
        },
        {
          "$project": {
            _id: "$_id",
            fullCameraLocationMd5: "$_id",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            monthly_num: "$monthly_num",
            cameraLocationMeta: "$cameraLocationMeta.cameraLocations"
          }
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$redact": {
            "$cond": [
              {"$eq": ['$cameraLocationMeta.fullCameraLocationMd5','$fullCameraLocationMd5']},
              "$$KEEP",
              "$$PRUNE"
            ]
          }
        },
        {
          "$project": {
            _id: "$_id",
            fullCameraLocationMd5: "$fullCameraLocationMd5",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            monthly_num: "$monthly_num",
            // cameraLocationMeta: "$cameraLocationMeta",
            wgs84dec_x: "$cameraLocationMeta.wgs84dec_x",
            wgs84dec_y: "$cameraLocationMeta.wgs84dec_y"
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
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"}
          }
        },
        {
          "$group":{
            "_id": "$_id.fullCameraLocationMd5",
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"},
            "monthly_num": {
              "$push": {
                "month": "$_id.month",
                "num": "$num"
              }
            }
          }
        },
        {
          "$lookup": {
            from: "Project",
            localField: "_id",
            foreignField: "cameraLocations.fullCameraLocationMd5",
            as: "cameraLocationMeta"
          }
        },
        {
          "$project": {
            _id: "$_id",
            fullCameraLocationMd5: "$_id",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            monthly_num: "$monthly_num",
            cameraLocationMeta: "$cameraLocationMeta.cameraLocations"
          }
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$redact": {
            "$cond": [
              {"$eq": ['$cameraLocationMeta.fullCameraLocationMd5','$fullCameraLocationMd5']},
              "$$KEEP",
              "$$PRUNE"
            ]
          }
        },
        {
          "$project": {
            _id: "$_id",
            fullCameraLocationMd5: "$fullCameraLocationMd5",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            monthly_num: "$monthly_num",
            // cameraLocationMeta: "$cameraLocationMeta",
            wgs84dec_x: "$cameraLocationMeta.wgs84dec_x",
            wgs84dec_y: "$cameraLocationMeta.wgs84dec_y"
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

  // 已辨識物種數/比例
  Project.remoteMethod (
    'imageSpeciesGroup',
    {
        http: {path: '/image-species-group', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.imageSpeciesGroup = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let projectTitle = data.projectTitle;
      let to_match = {
        '$and': [
          {"tokens.species_shortcut": {$ne: "尚未辨識"}},
          {"tokens.species_shortcut": {$ne: ""}},
          {"tokens.species_shortcut": {$ne: "無法識別"}},
          {"tokens.species_shortcut": {$ne: "空拍"}},
          {"tokens.species_shortcut": {$ne: "定時測試"}},
          {"tokens.species_shortcut": {$ne: "測試"}},
          {"tokens.species_shortcut": {$ne: "工作照"}}
        ]
      };

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
          "$unwind": "$tokens"
        },
        {
          "$group":{
            "_id": {"projectTitle": "$projectTitle", "species_shortcut": "$tokens.species_shortcut"},
            "count": {
              "$sum": 1
            },
            "species": {"$first": "$tokens.species_shortcut"},
            "projectTitle": {"$first": "$projectTitle"},
            "modified": {"$max": "$modified"}
          }
        },
        {
          "$group":{
            "_id": null,
            "species_group": {
              "$push": {
                "species": "$species",
                "count": "$count"
              }
            },
            "total": {
              "$sum": "$count"
            },
            "modified": {
              "$max": "$modified"
            }
          }
        },
        {
          "$project":{
            "_id": false,
            "species_group": "$species_group",
            "total": "$total",
            "modified": "$modified"
          }
        },
      ];

      mma.aggregate(aggregate_query).toArray(function(err, species_image_count) {
        if (err) {
          callback(err);
        }
        else {
          if (species_image_count.length == 0) {
            species_image_count = [{
              species_group: [],
              total: 0,
              modified: null
            }];
          }

          callback(null, species_image_count);
        }
      });

    });
  }

  // 資料異常值
  Project.remoteMethod (
    'locationMonthAbnormal',
    {
        http: {path: '/location-month-abnormal', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  Project.locationMonthAbnormal = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let year = data.year;
      let site = data.site;
      let projectTitle = data.projectTitle;
      let fullCameraLocationMd5 = data.fullCameraLocationMd5;
      let to_match = {};

      if (fullCameraLocationMd5) {
        to_match['fullCameraLocationMd5'] = fullCameraLocationMd5;
      }

      if (site) {
        to_match['site'] = site;
      }

      if (year) {
        to_match['abnormalMonthSpan.year'] = year;
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
      
      let mdl = db.collection("AbnormalData");
      let aggregate_query = [
        {
          "$match": to_match
        },
        {
          "$unwind": "$abnormalMonthSpan"
        },
        {
          "$group":{
            "_id": {"fullCameraLocationMd5": "$fullCameraLocationMd5", "month": "$abnormalMonthSpan.month"},
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"},
            "fullCameraLocationMd5": {"$first": "$fullCameraLocationMd5"},
            "year": {"$first": "$abnormalMonthSpan.year"},
            "month": {"$first": "$abnormalMonthSpan.month"},
            "abnormalType": {"$first": "$abnormalType"},
            "abnormalStartDate": {"$first": "$abnormalStartDate"},
            "abnormalEndDate": {"$first": "$abnormalEndDate"},
            "remarks": {"$first": "$remarks"},
          }
        },
        {
          "$group":{
            "_id": "$fullCameraLocationMd5",
            "projectTitle": {"$first": "$projectTitle"},
            "site": {"$first": "$site"},
            "subSite": {"$first": "$subSite"},
            "cameraLocation": {"$first": "$cameraLocation"},
            "fullCameraLocationMd5": {"$first": "$fullCameraLocationMd5"},
            "year": {"$first": "$year"},
            "month": {"$push": "$month"},
            "abnormalType": {"$first": "$abnormalType"},
            "abnormalStartDate": {"$first": "$abnormalStartDate"},
            "abnormalEndDate": {"$first": "$abnormalEndDate"},
            "remarks": {"$first": "$remarks"},
          }
        },
        {
          "$lookup": {
            from: "Project",
            localField: "_id",
            foreignField: "cameraLocations.fullCameraLocationMd5",
            as: "cameraLocationMeta"
          }
        },
        {
          "$project": {
            _id: "$_id",
            year: "$year",
            month: "$month",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            fullCameraLocationMd5: "$fullCameraLocationMd5",
            abnormalType: "$abnormalType",
            abnormalStartDate: "$abnormalStartDate",
            abnormalEndDate: "$abnormalEndDate",
            remarks: "$remarks",
            cameraLocationMeta: "$cameraLocationMeta.cameraLocations"
          }
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$unwind": "$cameraLocationMeta"
        },
        {
          "$redact": {
            "$cond": [
              {"$eq": ['$cameraLocationMeta.fullCameraLocationMd5','$fullCameraLocationMd5']},
              "$$KEEP",
              "$$PRUNE"
            ]
          }
        },
        {
          "$project": {
            _id: "$_id",
            year: "$year",
            month: "$month",
            projectTitle: "$projectTitle",
            site: "$site",
            subSite: "$subSite",
            cameraLocation: "$cameraLocation",
            fullCameraLocationMd5: "$fullCameraLocationMd5",
            abnormalType: "$abnormalType",
            abnormalStartDate: "$abnormalStartDate",
            abnormalEndDate: "$abnormalEndDate",
            remarks: "$remarks",
            wgs84dec_x: "$cameraLocationMeta.wgs84dec_x",
            wgs84dec_y: "$cameraLocationMeta.wgs84dec_y"
          }
        }
      ];

      console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregate_query).toArray(function(err, location_month_abnormal) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, location_month_abnormal);
        }
      });

    });
  }

  Project.remoteMethod (
    'summaryOfAll',
    {
        http: {path: '/summary-of-all', verb: 'get'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
          { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  // 計畫總覽
  Project.summaryOfAll = function (req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);
     
      let mdl = db.collection('CtpUser');
      let aggregate_query = [
        {
          "$unwind": "$project_roles"
        },
        {
          "$unwind": "$project_roles.roles"
        },
        {
          "$lookup": {
            from: "Project",
            localField: "project_roles.projectTitle",
            foreignField: "projectTitle",
            as: "project"
          }
        },
        {
          "$unwind": "$project"
        },
        {
          "$group": {
            _id: "$project._id",
            members: {
              "$addToSet": "$user_id"
            },
            funder: {$first: "$project.funder"},
            coverImage: {$first: "$project.cover_image"},
            earliestRecordTimestamp: {$first: "$project.earliestRecordTimestamp"}
          }
        },
        {
          "$project": {
            _id: false,
            projectTitle: "$_id",
            members: "$members",
            funder: "$funder",
            coverImage: "$coverImage",
            earliestRecordTimestamp: "$earliestRecordTimestamp"
          }
        }
      ];

      // console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregate_query).toArray(function(err, projects_summary) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, projects_summary);
        }
      });

    });
  }


  //////////////
  Project.remoteMethod (
    'projectDataFields',
    {
        http: {path: '/data-fields', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
          { arg: 'data', type: 'object', http: { source: 'body' } },
          { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  // 計畫總覽
  Project.projectDataFields = function (data, req, callback) {
    Project.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);
     
      let projectTitle = data.projectTitle;

      let mdl = db.collection('Project');
      let aggregate_query = [
        {"$match": {"_id": projectTitle}},
        {"$unwind": "$dataFieldEnabled"},
        {
          "$lookup": {
            "from": "DataFieldAvailable",
            "localField": "dataFieldEnabled",
            "foreignField": "key",
            "as": "field_details"
          }
        },
        {
          "$project": {
            "field_details": "$field_details",
            "speciesList": "$speciesList",
            "dailyTestTime": "$dailyTestTime"
          }
        },
        {"$unwind": "$field_details"},
        {
          "$group": {
            "_id": null,
            "speciesList": {"$first": "$speciesList"},
            "dailyTestTime": {"$first": "$dailyTestTime"},
            "fieldDetails": {"$push": "$field_details"}
          }
        }
      ];

      // console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregate_query).toArray(function(err, project_data_fields) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, project_data_fields);
        }
      });

    });
  }





  /////////////
  


};
