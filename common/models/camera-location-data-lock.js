'use strict';

module.exports = function(CameraLocationDataLock) {

  // location locked by someone
  CameraLocationDataLock.remoteMethod (
    'locationLocked',
    {
        http: {path: '/locked', verb: 'post'},
        // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
        accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: { arg: 'ret', type: 'object' }
    }
  );

  CameraLocationDataLock.locationLocked = function (data, req, callback) {
    CameraLocationDataLock.getDataSource().connector.connect(function(err, db) {
      if (err) return next(err);

      let projectTitle = data.projectTitle;
      let site = data.site;
      let subSite = data.subSite;
      let cameraLocation = data.cameraLocation;
      let fullCameraLocationMd5 = data.fullCameraLocationMd5;
      
      let to_match = {};

      if (site) {
        to_match['cameraLocations.site'] = site;
      }

      if (subSite) {
        to_match['cameraLocations.subSite'] = subSite;
      }

      if (cameraLocation) {
        to_match['cameraLocations.cameraLocation'] = subSite;
      }

      if (fullCameraLocationMd5) {
        to_match['cameraLocations.fullCameraLocationMd5'] = fullCameraLocationMd5;
      }

      if (projectTitle) {
        to_match['projectTitle'] = projectTitle;
      }
      else {
        return callback(new Error("請輸入計畫名稱"));
      }      
      
      let mdl = db.collection('Project');
      let aggregate_query = [
        {
          "$match": to_match
        },
        {
          "$unwind": "$cameraLocations"
        },
        {
          "$lookup": {
            from: "CameraLocationDataLock",
            localField: "cameraLocations.fullCameraLocationMd5",
            foreignField: "fullCameraLocationMd5",
            as: "cameraLocationDataLock"
          }
        },
        {
          "$unwind": "$cameraLocationDataLock"
        },
        {
          "$match": {
            "cameraLocationDataLock.locked": true
          }
        },
        {
          "$project": {
            _id: false,
            cameraLocationDataLock: {
              projectTitle: "$projectTitle",
              site: "$cameraLocations.site",
              subSite: "$cameraLocations.subSite",
              cameraLocation: "$cameraLocations.cameraLocation",
              fullCameraLocationMd5: "$cameraLocations.fullCameraLocationMd5",
              locked: "$cameraLocationDataLock.locked",
              locked_by: "$cameraLocationDataLock.locked_by",
              locked_on: "$cameraLocationDataLock.locked_on",
            }
          }
        },
        {
          "$lookup": {
            from: "CtpUser",
            localField: "cameraLocationDataLock.locked_by",
            foreignField: "_id",
            as: "lockedByUser"
          }
        },
        {
          "$unwind": "$lockedByUser"
        },
        {
          "$project": {
            _id: false,
            cameraLocationDataLock: {
              projectTitle: "$cameraLocationDataLock.projectTitle",
              site: "$cameraLocationDataLock.site",
              subSite: "$cameraLocationDataLock.subSite",
              cameraLocation: "$cameraLocationDataLock.cameraLocation",
              fullCameraLocationMd5: "$cameraLocationDataLock.fullCameraLocationMd5",
              locked: "$cameraLocationDataLock.locked",
              locked_by: {
                user_id: "$cameraLocationDataLock.locked_by",
                name: "$lockedByUser.name",
                email: "$lockedByUser.email",
              },
              locked_on: "$cameraLocationDataLock.locked_on"
            }
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
  
}