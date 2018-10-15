'use strict';

module.exports = function(ProjectMetadata) {

  ProjectMetadata.remoteMethod (
    'getUserRelatedProject',
    {
        http: {path: '/related-to-me', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  ProjectMetadata.getUserRelatedProject = function (data, req, callback) {
    ProjectMetadata.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let pm = db.collection(ProjectMetadata.definition.name);
      let cu = db.collection("ctp-users");
      let user_id = req.session.user_info.user_id;

      cu.aggregate(
        [
          {'$match': {"user_id": user_id}},
          {'$unwind': "$project_roles"},
          {'$group': {_id: "$project_roles.project"}},
          {
            '$lookup': {
              from: "project-metadata",
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
          }
        ]
      )
      .toArray(function(err, prjs){
        callback(null, prjs);
      });

    });
  }

  /////////////////////////////////

  ProjectMetadata.remoteMethod (
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

  ProjectMetadata.addUserToProject = function (data, req, callback) {

    ProjectMetadata.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      // let pm = db.collection(ProjectMetadata.definition.name);
      let cu = db.collection("ctp-users");
      //let user_id = req.session.user_info.user_id;

      let project = data.project;
      let user_to_add = data.user_id;
      let role = (!!data.role) ? data.role : "Member";

      cu.countDocuments({_id: user_to_add}, function(err, res) {

        if (err) {
          callback(err);
          return;
        }

        console.log(["user_exists", res]);
        if (res) { // 如果使用者存在
          cu.countDocuments({_id: user_to_add, "project_roles.project": project}, function(err, res) {
            console.log(res);
            let update, query;
            if (res == 0) {
              query = {_id: user_to_add};
              update = {
                '$addToSet': {
                  'project_roles': {
                    project: project,
                    roles: [ role ]
                  }
                }
              }
            }
            else {
              query = {
                "_id": user_to_add,
                "project_roles.project": project
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
};
