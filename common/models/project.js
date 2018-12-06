const util = require('util');
const csv = require('csv');
const errors = require('../errors');
const CreateModel = require('./share/CreateModel');
const { withCheckProjectAdmin } = require('./share/withCheckProjectRoles');

const csvStringify = util.promisify(csv.stringify);

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
        path: '/:projectId/user/add/:userId',
        verb: 'post',
      },
      withCheckProjectAdmin(require('./project/add-user')),
    )
    .router(
      {
        path: '/:projectId/user/remove/:userId',
        verb: 'post',
      },
      withCheckProjectAdmin(require('./project/remove-user')),
    )
    // .router(
    //   {
    //     path: '/add-user-to-project',
    //     verb: 'post',
    //   },
    //   require('./project/add-user-to-project'),
    // )
    .router(
      {
        path: '/location-month-retrieved-num',
        verb: 'post',
      },
      require('./project/location-month-retrieved-num'),
    )
    .router(
      {
        path: '/location-month-identified-num',
        verb: 'post',
      },
      require('./project/location-month-identified-num'),
    )
    .router(
      {
        path: '/image-species-group',
        verb: 'post',
      },
      require('./project/image-species-group'),
    )
    .router(
      {
        // 資料異常值
        path: '/location-month-abnormal',
        verb: 'post',
      },
      require('./project/location-month-abnormal'),
    )
    .router(
      {
        // 計畫總覽
        path: '/data-fields',
        verb: 'post',
      },
      require('./project/data-fields'),
    )
    .router(
      {
        path: '/:projectId/data-field/add',
        verb: 'post',
      },
      withCheckProjectAdmin(require('./project/data-fields-add')),
    )
    .router(
      {
        path: '/summary-of-all',
        verb: 'get',
      },
      require('./project/summary-of-all'),
    )
    .router(
      {
        path: '/init',
        verb: 'post',
      },
      require('./project/init'),
    );

  Project.remoteMethod('downloadExampleMultimediaAnnotations', {
    http: { path: '/:id/example-multimedia-annotations.csv', verb: 'get' },
    accepts: [
      { arg: 'id', type: 'string', required: true },
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'res', type: 'object', http: { source: 'res' } },
    ],
    returns: {},
  });
  Project.downloadExampleMultimediaAnnotations = function(
    projectId,
    req,
    res,
    callback,
  ) {
    if (!req.session.user_info) {
      return callback(new errors.Http403('使用者未登入'));
    }
    const { userId } = req.session.user_info;
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);
      const userCollection = db.collection('CtpUser');
      const projectCollection = db.collection('Project');
      const dataFieldAvailableCollection = db.collection('DataFieldAvailable');
      Promise.all([
        userCollection.findOne({ _id: userId }),
        projectCollection.findOne({ _id: projectId }),
        dataFieldAvailableCollection.find().toArray(),
      ])
        .then(([user, project, dataFields]) => {
          if (!user) {
            throw new Error('user not found');
          }
          if (!project) {
            throw new Error('project not found');
          }
          const projectIds = user.project_roles.map(role => role.projectId);
          if (projectIds.indexOf(project._id) < 0) {
            throw new Error('permission denied');
          }
          const dataFieldTable = {};
          dataFields.forEach(field => {
            dataFieldTable[field._id] = field;
          });
          const table = [
            ['樣區', '子樣區', '相機位置', '檔名', '時間', '物種'],
            [
              '苗栗縣',
              '南庄鄉田美村',
              'HC20A',
              'IMG_0001.JPG',
              '2017-02-07 12:00:00',
              '空拍',
            ],
            [
              '苗栗縣',
              '南庄鄉田美村',
              'HC20A',
              'IMG_0002.JPG',
              '2017-02-07 12:00:00',
              '空拍',
            ],
          ];
          if (project.cameraLocations && project.cameraLocations.length) {
            // Update site, subSite and cameraLocation when project.cameraLocation is exist.
            const firstCamera = project.cameraLocations[0];
            table[1][0] = firstCamera.site;
            table[1][1] = firstCamera.subSite;
            table[1][2] = firstCamera.cameraLocation;
            table[2][0] = firstCamera.site;
            table[2][1] = firstCamera.subSite;
            table[2][2] = firstCamera.cameraLocation;
          }
          if (project.speciesList && project.speciesList.length) {
            // Update spec when project.speciesList is exist.
            const firstSpec = project.speciesList[0];
            table[1][5] = firstSpec;
            table[2][5] = firstSpec;
          }
          (project.dataFieldEnabled || []).forEach(fieldId => {
            table[0].push(dataFieldTable[fieldId].label);
            if (
              dataFieldTable[fieldId].widget_select_options &&
              dataFieldTable[fieldId].widget_select_options.length
            ) {
              table[1].push(dataFieldTable[fieldId].widget_select_options[0]);
              table[2].push(dataFieldTable[fieldId].widget_select_options[0]);
            } else {
              table[1].push('');
              table[2].push('');
            }
          });
          return csvStringify(table);
        })
        .then(output => {
          res.setHeader(
            'Content-disposition',
            'attachment; filename=example.csv',
          );
          res.contentType('csv');
          res.send(output);
        })
        .catch(error => {
          callback(error);
        });
    });
  };

  Project.remoteMethod('exportMultimediaAnnotations', {
    http: { path: '/:id/multimedia-annotations.csv', verb: 'get' },
    accepts: [
      { arg: 'id', type: 'string', required: true },
      { arg: 'site', type: 'string', http: { source: 'query' } },
      { arg: 'subSite', type: 'string', http: { source: 'query' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'res', type: 'object', http: { source: 'res' } },
    ],
    returns: {},
  });
  Project.exportMultimediaAnnotations = function(
    projectId,
    site,
    subSite,
    req,
    res,
    callback,
  ) {
    if (!req.session.user_info) {
      return callback(new errors.Http403('使用者未登入'));
    }
    const { userId } = req.session.user_info;
    Project.getDataSource().connector.connect((err, db) => {
      if (err) return callback(err);
      const userCollection = db.collection('CtpUser');
      const projectCollection = db.collection('Project');
      const dataFieldAvailableCollection = db.collection('DataFieldAvailable');
      const multimediaAnnotationCollection = db.collection(
        'MultimediaAnnotation',
      );
      Promise.all([
        userCollection.findOne({ _id: userId }),
        projectCollection.findOne({ _id: projectId }),
        dataFieldAvailableCollection.find().toArray(),
      ])
        .then(([user, project, dataFields]) => {
          if (!user) {
            throw new Error('user not found');
          }
          if (!project) {
            throw new Error('project not found');
          }
          const projectIds = user.project_roles.map(role => role.projectId);
          if (projectIds.indexOf(project._id) < 0) {
            throw new Error('permission denied');
          }
          const dataFieldTable = {};
          dataFields.forEach(field => {
            dataFieldTable[field._id] = field.label;
          });
          const multimediaAnnotationQuery = {
            projectId: project._id,
          };
          if (site) {
            multimediaAnnotationQuery.site = site;
          }
          if (subSite) {
            multimediaAnnotationQuery.subSite = subSite;
          }
          const headRow = [
            ['樣區', '子樣區', '相機位置', '檔名', '時間', '物種'],
          ];
          (project.dataFieldEnabled || []).forEach(fieldId => {
            headRow[0].push(dataFieldTable[fieldId]);
          });
          res.setHeader(
            'Content-disposition',
            'attachment; filename=export.csv',
          );
          res.contentType('csv');
          return Promise.all([
            project,
            multimediaAnnotationQuery,
            csvStringify(headRow),
          ]);
        })
        .then(([project, multimediaAnnotationQuery, headOutput]) => {
          res.write(headOutput);
          let writePromise = null;
          multimediaAnnotationCollection
            .find(multimediaAnnotationQuery)
            .sort([
              ['cameraLocation', 1],
              ['date_time_corrected_timestamp', 1],
              ['uploaded_file_name', 1],
            ])
            .stream()
            .on('data', multimediaAnnotation => {
              const appendLeftFields = (items, annotation) => {
                /*
                Append a basic information of the multimedia annotation into the array.
                @param items {Array}
                @param annotation {MultimediaAnnotation}
                 */
                items.push([
                  annotation.site,
                  annotation.subSite,
                  annotation.cameraLocation,
                  annotation.uploaded_file_name,
                  annotation.corrected_date_time,
                ]);
              };
              const table = [];
              for (
                let tokenIndex = 0;
                tokenIndex < multimediaAnnotation.tokens.length;
                tokenIndex += 1
              ) {
                appendLeftFields(table, multimediaAnnotation);
                multimediaAnnotation.tokens[tokenIndex].data.forEach(field => {
                  switch (field.key) {
                    case 'species': {
                      table[tokenIndex][5] = field.value;
                      break;
                    }
                    default: {
                      for (
                        let index = 0;
                        index < project.dataFieldEnabled.length;
                        index += 1
                      ) {
                        if (project.dataFieldEnabled[index] === field.key) {
                          table[tokenIndex][index + 6] = field.value;
                          break;
                        }
                      }
                      break;
                    }
                  }
                });
              }
              if (writePromise) {
                writePromise = writePromise.then(() =>
                  csvStringify(table).then(output => {
                    res.write(output);
                  }),
                );
              } else {
                writePromise = csvStringify(table).then(output => {
                  res.write(output);
                });
              }
            })
            .on('end', () => {
              if (writePromise) {
                writePromise.then(() => {
                  res.end();
                });
              } else {
                res.end();
              }
            })
            .on('error', error => {
              throw error;
            });
        })
        .catch(error => {
          callback(error);
        });
    });
  };

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
                    projectId: project._id,
                    // eslint-disable-next-line
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

  // --------------------------------------------------
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
                  projectId: project._id,
                  // eslint-disable-next-line
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
};
