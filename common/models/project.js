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
