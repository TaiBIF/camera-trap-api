const CreateModel = require('../../server/share/CreateModel');

module.exports = function(Project) {
  const model = new CreateModel(Project);

  model
    .router(
      {
        path: '/related-to-me',
        verb: 'post',
      },
      require('./project/related-to-me'),
    )
    .router(
      {
        path: '/add-user-to-project',
        verb: 'post',
      },
      require('./project/add-user-to-project'),
    )
    .router(
      {
        path: '/init',
        verb: 'post',
      },
      require('./project/init'),
    );

  Project.remoteMethod('multimediaAnnotationErrorCameras', {
    http: { path: '/:id/multimedia-annotation-error-cameras', verb: 'get' },
    accepts: [
      { arg: 'id', type: 'string', required: true },
      { arg: 'site', type: 'string', http: { source: 'query' } },
      { arg: 'subSite', type: 'string', http: { source: 'query' } },
    ],
    returns: { arg: 'results', type: [{ type: 'object' }] },
  });
  Project.multimediaAnnotationErrorCameras = function(
    projectId,
    site,
    subSite,
    callback,
  ) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);
      const projectCollection = db.collection('Project');
      const multimediaAnnotationCollection = db.collection(
        'MultimediaAnnotation',
      );
      projectCollection
        .findOne({ _id: projectId })
        .then(project => {
          if (!project) {
            throw new Error('project not found');
          }
          return multimediaAnnotationCollection
            .aggregate([
              {
                $match: (() => {
                  const query = {
                    projectTitle: project.projectTitle,
                    multimedia_error_flag: true,
                  };
                  if (site) {
                    query.site = site;
                  }
                  if (subSite) {
                    query.subSite = subSite;
                  }
                  return query;
                })(),
              },
              {
                $group: {
                  _id: {
                    site: '$site',
                    subSite: '$subSite',
                    cameraLocation: '$cameraLocation',
                  },
                  count: { $sum: 1 },
                },
              },
            ])
            .toArray();
        })
        .then(result => {
          callback(
            null,
            result.map(item => ({
              site: item._id.site,
              subSite: item._id.subSite,
              cameraLocation: item._id.cameraLocation,
              errorCount: item.count,
            })),
          );
        })
        .catch(error => {
          if (error) {
            callback(error);
          }
        });
    });
  };

  Project.remoteMethod('getLocationMonthRetrievedNum', {
    http: { path: '/location-month-retrieved-num', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  Project.getLocationMonthRetrievedNum = function(data, req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const { fullCameraLocationMd5, year, site, subSite, projectTitle } = data;
      const toMatch = {};
      if (fullCameraLocationMd5) {
        toMatch.fullCameraLocationMd5 = fullCameraLocationMd5;
      }

      if (site) {
        toMatch.site = site;
      }

      if (subSite) {
        toMatch.subSite = subSite;
      }

      if (year) {
        toMatch.year = year;
      } else {
        return callback(new Error('請輸入年份'));
      }

      if (projectTitle) {
        toMatch.projectTitle = projectTitle;
      } else {
        return callback(new Error('請輸入計畫名稱'));
      }

      const mmm = db.collection('MultimediaMetadata');
      const aggregateQuery = [
        {
          $match: toMatch,
        },
        {
          $group: {
            _id: {
              fullCameraLocationMd5: '$fullCameraLocationMd5',
              month: '$month',
            },
            num: {
              $sum: 1,
            },
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
          },
        },
        {
          $group: {
            _id: '$_id.fullCameraLocationMd5',
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
            monthly_num: {
              $push: {
                month: '$_id.month',
                num: '$num',
              },
            },
          },
        },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'cameraLocations.fullCameraLocationMd5',
            as: 'cameraLocationMeta',
          },
        },
        {
          $project: {
            _id: '$_id',
            fullCameraLocationMd5: '$_id',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            monthly_num: '$monthly_num',
            cameraLocationMeta: '$cameraLocationMeta.cameraLocations',
          },
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $redact: {
            $cond: [
              {
                $eq: [
                  '$cameraLocationMeta.fullCameraLocationMd5',
                  '$fullCameraLocationMd5',
                ],
              },
              '$$KEEP',
              '$$PRUNE',
            ],
          },
        },
        {
          $project: {
            _id: '$_id',
            fullCameraLocationMd5: '$fullCameraLocationMd5',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            monthly_num: '$monthly_num',
            // cameraLocationMeta: "$cameraLocationMeta",
            wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
            wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
          },
        },
      ];

      mmm.aggregate(aggregateQuery).toArray((_err, locationMonthNum) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, locationMonthNum);
        }
      });
    });
  };

  Project.remoteMethod('getLocationMonthIdentifiedNum', {
    http: { path: '/location-month-identified-num', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  Project.getLocationMonthIdentifiedNum = function(data, req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const { fullCameraLocationMd5, year, site, subSite, projectTitle } = data;

      const toMatch = {
        $and: [
          { 'tokens.species_shortcut': { $ne: '尚未辨識' } },
          { 'tokens.species_shortcut': { $ne: '' } },
        ],
      };

      if (fullCameraLocationMd5) {
        toMatch.fullCameraLocationMd5 = fullCameraLocationMd5;
      }

      if (site) {
        toMatch.site = site;
      }

      if (subSite) {
        toMatch.subSite = subSite;
      }

      if (year) {
        toMatch.year = year;
      } else {
        return callback(new Error('請輸入年份'));
      }

      if (projectTitle) {
        toMatch.projectTitle = projectTitle;
      } else {
        return callback(new Error('請輸入計畫名稱'));
      }

      const mma = db.collection('MultimediaAnnotation');
      const aggregateQuery = [
        {
          $match: toMatch,
        },
        {
          $group: {
            _id: {
              fullCameraLocationMd5: '$fullCameraLocationMd5',
              month: '$month',
            },
            num: {
              $sum: 1,
            },
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
          },
        },
        {
          $group: {
            _id: '$_id.fullCameraLocationMd5',
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
            monthly_num: {
              $push: {
                month: '$_id.month',
                num: '$num',
              },
            },
          },
        },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'cameraLocations.fullCameraLocationMd5',
            as: 'cameraLocationMeta',
          },
        },
        {
          $project: {
            _id: '$_id',
            fullCameraLocationMd5: '$_id',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            monthly_num: '$monthly_num',
            cameraLocationMeta: '$cameraLocationMeta.cameraLocations',
          },
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $redact: {
            $cond: [
              {
                $eq: [
                  '$cameraLocationMeta.fullCameraLocationMd5',
                  '$fullCameraLocationMd5',
                ],
              },
              '$$KEEP',
              '$$PRUNE',
            ],
          },
        },
        {
          $project: {
            _id: '$_id',
            fullCameraLocationMd5: '$fullCameraLocationMd5',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            monthly_num: '$monthly_num',
            // cameraLocationMeta: "$cameraLocationMeta",
            wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
            wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
          },
        },
      ];

      mma.aggregate(aggregateQuery).toArray((_err, locationMonthNum) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, locationMonthNum);
        }
      });
    });
  };

  // 已辨識物種數/比例
  Project.remoteMethod('imageSpeciesGroup', {
    http: { path: '/image-species-group', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  Project.imageSpeciesGroup = function(data, req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const { projectTitle } = data;
      const toMatch = {
        $and: [
          { 'tokens.species_shortcut': { $ne: '尚未辨識' } },
          { 'tokens.species_shortcut': { $ne: '' } },
          { 'tokens.species_shortcut': { $ne: '無法識別' } },
          { 'tokens.species_shortcut': { $ne: '空拍' } },
          { 'tokens.species_shortcut': { $ne: '定時測試' } },
          { 'tokens.species_shortcut': { $ne: '測試' } },
          { 'tokens.species_shortcut': { $ne: '工作照' } },
        ],
      };

      if (projectTitle) {
        toMatch.projectTitle = projectTitle;
      } else {
        return callback(new Error('請輸入計畫名稱'));
      }

      const mma = db.collection('MultimediaAnnotation');
      const aggregateQuery = [
        {
          $match: toMatch,
        },
        {
          $unwind: '$tokens',
        },
        {
          $group: {
            _id: {
              projectTitle: '$projectTitle',
              species_shortcut: '$tokens.species_shortcut',
            },
            count: {
              $sum: 1,
            },
            species: { $first: '$tokens.species_shortcut' },
            projectTitle: { $first: '$projectTitle' },
            modified: { $max: '$modified' },
          },
        },
        {
          $group: {
            _id: null,
            species_group: {
              $push: {
                species: '$species',
                count: '$count',
              },
            },
            total: {
              $sum: '$count',
            },
            modified: {
              $max: '$modified',
            },
          },
        },
        {
          $project: {
            _id: false,
            species_group: '$species_group',
            total: '$total',
            modified: '$modified',
          },
        },
      ];

      mma.aggregate(aggregateQuery).toArray((_err, speciesImageCount) => {
        if (_err) {
          callback(_err);
        } else if (speciesImageCount.length === 0) {
          speciesImageCount = [
            {
              species_group: [],
              total: 0,
              modified: null,
            },
          ];
          callback(null, speciesImageCount);
        }
      });
    });
  };

  // 資料異常值
  Project.remoteMethod('locationMonthAbnormal', {
    http: { path: '/location-month-abnormal', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  Project.locationMonthAbnormal = function(data, req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const { year, site, subSite, projectTitle, fullCameraLocationMd5 } = data;

      const toMatch = {};

      if (fullCameraLocationMd5) {
        toMatch.fullCameraLocationMd5 = fullCameraLocationMd5;
      }

      if (site) {
        toMatch.site = site;
      }

      if (subSite) {
        toMatch.subSite = subSite;
      }

      if (year) {
        toMatch['abnormalMonthSpan.year'] = year;
      } else {
        return callback(new Error('請輸入年份'));
      }

      if (projectTitle) {
        toMatch.projectTitle = projectTitle;
      } else {
        return callback(new Error('請輸入計畫名稱'));
      }

      const mdl = db.collection('AbnormalData');
      const aggregateQuery = [
        {
          $match: toMatch,
        },
        {
          $unwind: '$abnormalMonthSpan',
        },
        {
          $group: {
            _id: {
              fullCameraLocationMd5: '$fullCameraLocationMd5',
              month: '$abnormalMonthSpan.month',
            },
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
            fullCameraLocationMd5: { $first: '$fullCameraLocationMd5' },
            year: { $first: '$abnormalMonthSpan.year' },
            month: { $first: '$abnormalMonthSpan.month' },
            abnormalType: { $first: '$abnormalType' },
            abnormalStartDate: { $first: '$abnormalStartDate' },
            abnormalEndDate: { $first: '$abnormalEndDate' },
            remarks: { $first: '$remarks' },
          },
        },
        {
          $group: {
            _id: '$fullCameraLocationMd5',
            projectTitle: { $first: '$projectTitle' },
            site: { $first: '$site' },
            subSite: { $first: '$subSite' },
            cameraLocation: { $first: '$cameraLocation' },
            fullCameraLocationMd5: { $first: '$fullCameraLocationMd5' },
            year: { $first: '$year' },
            month: { $push: '$month' },
            abnormalType: { $first: '$abnormalType' },
            abnormalStartDate: { $first: '$abnormalStartDate' },
            abnormalEndDate: { $first: '$abnormalEndDate' },
            remarks: { $first: '$remarks' },
          },
        },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'cameraLocations.fullCameraLocationMd5',
            as: 'cameraLocationMeta',
          },
        },
        {
          $project: {
            _id: '$_id',
            year: '$year',
            month: '$month',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            fullCameraLocationMd5: '$fullCameraLocationMd5',
            abnormalType: '$abnormalType',
            abnormalStartDate: '$abnormalStartDate',
            abnormalEndDate: '$abnormalEndDate',
            remarks: '$remarks',
            cameraLocationMeta: '$cameraLocationMeta.cameraLocations',
          },
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $unwind: '$cameraLocationMeta',
        },
        {
          $redact: {
            $cond: [
              {
                $eq: [
                  '$cameraLocationMeta.fullCameraLocationMd5',
                  '$fullCameraLocationMd5',
                ],
              },
              '$$KEEP',
              '$$PRUNE',
            ],
          },
        },
        {
          $project: {
            _id: '$_id',
            year: '$year',
            month: '$month',
            projectTitle: '$projectTitle',
            site: '$site',
            subSite: '$subSite',
            cameraLocation: '$cameraLocation',
            fullCameraLocationMd5: '$fullCameraLocationMd5',
            abnormalType: '$abnormalType',
            abnormalStartDate: '$abnormalStartDate',
            abnormalEndDate: '$abnormalEndDate',
            remarks: '$remarks',
            wgs84dec_x: '$cameraLocationMeta.wgs84dec_x',
            wgs84dec_y: '$cameraLocationMeta.wgs84dec_y',
          },
        },
      ];

      // console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregateQuery).toArray((_err, locationMonthAbnormal) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, locationMonthAbnormal);
        }
      });
    });
  };

  Project.remoteMethod('summaryOfAll', {
    http: { path: '/summary-of-all', verb: 'get' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }],
    returns: { arg: 'ret', type: 'object' },
  });

  // 計畫總覽
  Project.summaryOfAll = function(req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const mdl = db.collection('CtpUser');
      const aggregateQuery = [
        {
          $unwind: '$project_roles',
        },
        {
          $unwind: '$project_roles.roles',
        },
        {
          $lookup: {
            from: 'Project',
            localField: 'project_roles.projectTitle',
            foreignField: 'projectTitle',
            as: 'project',
          },
        },
        {
          $unwind: '$project',
        },
        {
          $group: {
            _id: '$project._id',
            members: {
              $addToSet: '$user_id',
            },
            funder: { $first: '$project.funder' },
            coverImage: { $first: '$project.cover_image' },
            earliestRecordTimestamp: {
              $first: '$project.earliestRecordTimestamp',
            },
          },
        },
        {
          $project: {
            _id: false,
            projectTitle: '$_id',
            members: '$members',
            funder: '$funder',
            coverImage: '$coverImage',
            earliestRecordTimestamp: '$earliestRecordTimestamp',
          },
        },
      ];

      // console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregateQuery).toArray((_err, projectsSummary) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, projectsSummary);
        }
      });
    });
  };

  Project.remoteMethod('multimediaAnnotationErrorSites', {
    http: { path: '/:id/multimedia-annotation-error-sites', verb: 'get' },
    accepts: [{ arg: 'id', type: 'string', required: true }],
    returns: { arg: 'results', type: [{ type: 'object' }] },
  });
  Project.multimediaAnnotationErrorSites = function(projectId, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);
      const projectCollection = db.collection('Project');
      const multimediaAnnotationCollection = db.collection(
        'MultimediaAnnotation',
      );

      projectCollection
        .findOne({ _id: projectId })
        .then(project => {
          if (!project) {
            throw new Error('project not found');
          }
          return multimediaAnnotationCollection
            .aggregate([
              {
                $match: {
                  projectTitle: project.projectTitle,
                  multimedia_error_flag: true,
                },
              },
              {
                $group: {
                  _id: { site: '$site', subSite: '$subSite' },
                  count: { $sum: 1 },
                },
              },
            ])
            .toArray();
        })
        .then(result => {
          callback(
            null,
            result.map(item => ({
              site: item._id.site,
              subSite: item._id.subSite,
              errorCount: item.count,
            })),
          );
        })
        .catch(error => {
          if (error) {
            callback(error);
          }
        });
    });
  };

  // / ///////////
  Project.remoteMethod('projectDataFields', {
    http: { path: '/data-fields', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  // 計畫總覽
  Project.projectDataFields = function(data, req, callback) {
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);

      const { projectTitle } = data;

      const mdl = db.collection('Project');
      const aggregateQuery = [
        { $match: { _id: projectTitle } },
        { $unwind: '$dataFieldEnabled' },
        {
          $lookup: {
            from: 'DataFieldAvailable',
            localField: 'dataFieldEnabled',
            foreignField: 'key',
            as: 'field_details',
          },
        },
        {
          $project: {
            field_details: '$field_details',
            speciesList: '$speciesList',
            dailyTestTime: '$dailyTestTime',
          },
        },
        { $unwind: '$field_details' },
        {
          $group: {
            _id: null,
            speciesList: { $first: '$speciesList' },
            dailyTestTime: { $first: '$dailyTestTime' },
            fieldDetails: { $push: '$field_details' },
          },
        },
      ];

      // console.log(JSON.stringify(aggregate_query, null, 2));

      mdl.aggregate(aggregateQuery).toArray((_err, projectDataFields) => {
        if (_err) {
          callback(_err);
        } else {
          callback(null, projectDataFields);
        }
      });
    });
  };

  // / //////////
};
