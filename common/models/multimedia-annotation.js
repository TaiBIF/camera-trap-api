/* eslint-disable */
const Json2csvParser = require('json2csv').Parser;
const uuid = require('uuid');

function uploadToS3(params) {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3();

  return new Promise((resolve, reject) => {
    s3.upload(params, {}, (err, data) => {
      if (err) {
        console.log('ERROR!');
        reject(err);
      } else {
        console.log('OK');
        resolve();
      }
    });
  });
}

function leadingZero(str, zeros = '00', digit = 2) {
  return (zeros + str).substr(-digit);
}

module.exports = function(MultimediaAnnotation) {
  const addRevision = function(context, result, next) {
    const argsData = context.args.data;
    const method = context.methodString.split('.').pop();
    const revisions = [];
    let userId;
    try {
      // TODO: camera-trap-user-id 只在測試環境使用，正式環境要把這個 headers 拿掉
      userId =
        context.req.headers['camera-trap-user-id'] || context.req.session.user_info.userId;
    } catch (e) {}

    MultimediaAnnotation.getDataSource().connector.connect(async (err, db) => {
      if (err) {
        next(err);
      }
      const multimediaAnnotationCollection = db.collection('MultimediaAnnotation');
      const multimediaAnnotationTable = {};

      argsData.forEach(d => {
        let firstKey;
        switch (method) {
          case 'bulkUpdate':
            firstKey = Object.keys(d.updateOne.update.$set || {})[0] || '';
            if (firstKey.indexOf('.') > 0) {
              multimediaAnnotationTable[d.updateOne.filter._id] = null;
            }
            break;
          case 'bulkInsert':
            firstKey = Object.keys(d.insertOne.document || {})[0] || '';
            if (firstKey.indexOf('.') > 0) {
              multimediaAnnotationTable[d.insertOne.document._id] = null;
            }
            break;
          case 'bulkReplace':
            firstKey = Object.keys(d.replaceOne.replacement || {})[0] || '';
            if (firstKey.indexOf('.') > 0) {
              multimediaAnnotationTable[d.replaceOne.filter._id] = null;
            }
            break;
        }
      });
      multimediaAnnotationCollection
        .find({_id: {$in: Object.keys(multimediaAnnotationTable)}})
        .toArray()
        .then(multimediaAnnotations => {
          multimediaAnnotations.forEach(multimediaAnnotation => {
            multimediaAnnotationTable[multimediaAnnotation._id] = multimediaAnnotation;
          });

          argsData.forEach(d => {
            const _revision = {};
            let makeRevision;
            let _tokens = [];

            makeRevision = true;

            switch (method) {
              case 'bulkUpdate':
                try {
                  const testRequired = d.updateOne.update.$set.tokens[0].data[0].key;
                  if (testRequired === undefined) makeRevision = false;
                } catch (e) {
                  makeRevision = false;
                }

                if (makeRevision) {
                  _revision.url_md5 = d.updateOne.filter._id;
                  _revision.created = d.updateOne.update.$set.modified;
                  _tokens = d.updateOne.update.$set.tokens;
                } else if (d.updateOne.filter._id in multimediaAnnotationTable) {
                  makeRevision = true;
                  _revision.url_md5 = d.updateOne.filter._id;
                  _revision.created = multimediaAnnotationTable[d.updateOne.filter._id].modified;
                  _tokens = multimediaAnnotationTable[d.updateOne.filter._id].tokens;
                }
                break;
              case 'bulkInsert':
                try {
                  const testRequired = d.insertOne.document.tokens[0].data[0].key;
                  if (testRequired === undefined) makeRevision = false;
                } catch (e) {
                  makeRevision = false;
                }

                if (makeRevision) {
                  _revision.url_md5 = d.insertOne.document._id;
                  _revision.created = d.insertOne.document.modified;
                  _tokens = d.insertOne.document.tokens;
                } else if (d.insertOne.document._id in multimediaAnnotationTable) {
                  makeRevision = true;
                  _revision.url_md5 = d.insertOne.document._id;
                  _revision.created = multimediaAnnotationTable[d.insertOne.document._id].modified;
                  _tokens = multimediaAnnotationTable[d.insertOne.document._id].tokens;
                }
                break;

              case 'bulkReplace':
                try {
                  const testRequired = d.replaceOne.replacement.tokens[0].data[0].key;
                  if (testRequired === undefined) makeRevision = false;
                } catch (e) {
                  makeRevision = false;
                }

                if (makeRevision) {
                  _revision.url_md5 = d.replaceOne.filter._id;
                  _revision.created = d.replaceOne.replacement.modified;
                  _tokens = d.replaceOne.replacement.tokens;
                } else if (d.replaceOne.filter._id in multimediaAnnotationTable) {
                  makeRevision = true;
                  _revision.url_md5 = d.replaceOne.filter._id;
                  _revision.created = multimediaAnnotationTable[d.replaceOne.filter._id].modified;
                  _tokens = multimediaAnnotationTable[d.replaceOne.filter._id].tokens;
                }
                break;
              default:
                break;
            }
            /* eslint-enable */
            if (makeRevision) {
              _revision.tokens = _tokens.map(t => {
                const keyValPair = {};
                let keyCounter = 0;
                t.data.forEach(_d => {
                  if (_d.key) {
                    keyCounter += 1;
                    keyValPair[_d.key] = _d.value;
                  }
                });
                if (keyCounter > 0) {
                  return {
                    // token_id: t.token_id,
                    data: t.data,
                    summary: keyValPair,
                  };
                }
                return false;
              });
              _revision.tokens = _revision.tokens.filter(t => t !== false);
              if (_revision.tokens.length) {
                const updateOne = {
                  updateOne: {
                    filter: { _id: _revision.url_md5 },
                    update: {
                      $push: {
                        revisions: {
                          $each: [
                            {
                              modifiedBy: userId,
                              created: _revision.created,
                              tokens: _revision.tokens,
                            },
                          ],
                          $slice: -5,
                        },
                      },
                      $setOnInsert: {
                        _id: _revision.url_md5,
                        /* eslint-disable camelcase */
                        url_md5: _revision.url_md5,
                      },
                    },
                    upsert: true,
                  },
                };
                revisions.push(updateOne);
              }
            }
          });
          if (revisions.length > 0) {
            const MAR = db.collection('MultimediaAnnotationRevision');
            MAR.bulkWrite(revisions, { ordered: false }, (_err, results) => {
              if (_err) {
                next(_err);
              } else {
                next();
              }
            });
          } else {
            next();
          }
        })
        .catch(error => {
          next(error);
        });
    });
  };

  MultimediaAnnotation.remoteMethod('basicCalculation', {
    http: { path: '/basic-calculation', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  MultimediaAnnotation.basicCalculation = function(data, req, callback) {
    /* eslint-disable */
    MultimediaAnnotation.getDataSource().connector.connect(async (err, db) => {
      if (err) return callback(err);

      console.log(req.session);

      /* 測試計畫1
      {
        "projectId": "d8064aa7-9643-44fb-bed9-1f23a690f968",
        "site": "臺東處",
        "subSite": "NULL",
        "species": "山羌",
        "fromDateTime": "2018-01-01 00:00:00",
        "toDateTime": "2018-03-31 23:59:59"
      }
      // */
      const mdl = db.collection('MultimediaAnnotation');

      const toMatch = {};

      const { projectId, projectTitle, site, subSite, species } = data;
      if (projectId) {
        toMatch.projectId = projectId;
      } else {
        return callback(new Error());
      }

      if (site) {
        toMatch.site = site;
      } else {
        return callback(new Error());
      }

      if (subSite) {
        toMatch.subSite = subSite;
      }

      const { fullCameraLocationMd5s } = data;
      if (
        Array.isArray(fullCameraLocationMd5s) &&
        fullCameraLocationMd5s.length > 0
      ) {
        toMatch.fullCameraLocationMd5 = { $in: fullCameraLocationMd5s };
      }

      const fromDateTime = new Date(data.fromDateTime + '+8').getTime() / 1000;
      const toDateTime = new Date(data.toDateTime + '+8').getTime() / 1000;

      toMatch.date_time_corrected_timestamp = {
        $gte: fromDateTime,
        $lte: toDateTime,
      };

      const perLocationMinMaxWorking = {};
      const timezoneOffset = -8 * 60 * 60; // 秒

      const perLocationMinMaxWorkingTimeAggregateQuery = [
        {
          $match: toMatch,
        },
        {
          $group: {
            _id: '$fullCameraLocationMd5',
            minWorkingTime: {
              $min: '$date_time_corrected_timestamp',
            },
            maxWorkingTime: {
              $max: '$date_time_corrected_timestamp',
            },
          },
        },
      ];

      const perLocationMinMaxWorkingTime = await mdl
        .aggregate(perLocationMinMaxWorkingTimeAggregateQuery, {})
        .toArray();
      console.log(perLocationMinMaxWorkingTime);

      //*
      perLocationMinMaxWorkingTime.forEach((item, idx, arr) => {
        const workingHours =
          Math.floor(item.maxWorkingTime / 3600) -
          Math.floor(item.minWorkingTime / 3600) +
          1;
        // 先對齊 +8 時區的每日 0 點基準，再計算有工作的日數
        const workingDays =
          Math.floor((item.maxWorkingTime - timezoneOffset) / (3600 * 24)) -
          Math.floor((item.minWorkingTime - timezoneOffset) / (3600 * 24)) +
          1;
        console.log([timezoneOffset, workingHours, workingDays]);

        perLocationMinMaxWorking[item._id] = {
          hours: workingHours,
          days: workingDays,
        };
      });

      console.log(perLocationMinMaxWorking);
      //* /

      //*
      if (species) {
        toMatch['tokens.data.key'] = 'species';
        toMatch['tokens.data.value'] = species;
      }
      //* /

      const projection = {
        url: true,
        projectId: true,
        projectTitle: true,
        site: true,
        subSite: true,
        cameraLocation: true,
        fullCameraLocationMd5: true,
        // tokens: false,
        'tokens.data.key': true,
        'tokens.data.value': true,

        tokens: {
          $elemMatch: {
            'data.key': 'species',
            'data.value': species,
          },
        },

        //* /
        corrected_date_time: true,
        date_time_corrected_timestamp: true,
      };

      const prjMdl = db.collection('Project');
      // 取得計畫啟用的自訂欄位
      prjMdl.findOne(
        { projectId },
        { projection: { dataFieldEnabled: true } },
        (_err, res) => {
          if (_err) {
            callback(_err);
          } else if (res) {
            let requiredFields = res.dataFieldEnabled || [];
            requiredFields = ['species'].concat(requiredFields);
            console.log(requiredFields);

            mdl
              .find(toMatch, {
                projection,
                sort: [
                  ['cameraLocation', 1],
                  ['date_time_corrected_timestamp', 1],
                  ['uploaded_file_name', 1],
                ],
              })
              .toArray(async (__err, results) => {
                if (__err) {
                  callback(__err);
                } else {
                  const csvTemplate = {};
                  requiredFields.forEach(f => {
                    csvTemplate[f] = 'NA';
                  });

                  const keys = Object.keys(csvTemplate);
                  let fields = [
                    'projectId',
                    'projectTitle',
                    'site',
                    'subSite',
                    'cameraLocation',
                    'filename',
                    'date_time',
                    'timestamp',
                    'workingHours',
                    'workingDays',
                  ];
                  fields = fields.concat(keys);
                  const opts = { fields };
                  const parser = new Json2csvParser(opts);

                  const csvRecords = [];

                  let csv = '';

                  results.forEach((annotation) => {
                    annotation.tokens.forEach(token => {
                      const csvRecord = {};
                      Object.assign(csvRecord, csvTemplate);
                      token.data.forEach(d => {
                        if (csvRecord[d.key]) {
                          csvRecord[d.key] = d.value || 'NA';
                        }
                      });
                      // csvRecordArr = keys.map(key => csvRecord[key]);
                      csvRecord.filename = annotation.url.split('/').pop();
                      csvRecord.date_time = annotation.corrected_date_time;
                      csvRecord.timestamp =
                        annotation.date_time_corrected_timestamp;
                      csvRecord.projectId = annotation.projectId;
                      csvRecord.projectTitle = annotation.projectTitle;
                      csvRecord.site = annotation.site;
                      csvRecord.subSite = annotation.subSite;
                      csvRecord.cameraLocation = annotation.cameraLocation;
                      csvRecord.workingHours =
                        perLocationMinMaxWorking[
                          annotation.fullCameraLocationMd5
                        ].hours;
                      csvRecord.workingDays =
                        perLocationMinMaxWorking[
                          annotation.fullCameraLocationMd5
                        ].days;
                      csvRecords.push(csvRecord);
                    });
                  });

                  csv = parser.parse(csvRecords);
                  // TODO: write to S3
                  console.log('Before getting credentials');

                  const uniqueCalcId = uuid();
                  const calcBucket = 'taibif-s3-mount-bucket';
                  const calcDataContainer = 'data_for_calculation';
                  const fileToBeAnalyzed = `${uniqueCalcId}/data.csv`;
                  const statusOfCalculation = `${uniqueCalcId}/status.log`;
                  const fileOfResults = `${uniqueCalcId}/results.csv`;
                  const params = {
                    Bucket: calcBucket,
                    Key: `${calcDataContainer}/${fileToBeAnalyzed}`,
                    Body: csv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                  };

                  const s3UrlBase = 'https://s3-ap-northeast-1.amazonaws.com';
                  uploadToS3(params).then(() => {
                    const http = require('http');
                    const calcPath = 'basic-calculation';
                    const calcBaseUrl = 'http://52.193.13.151:80';

                    console.log(`Uploaded: ${calcDataContainer}/${fileToBeAnalyzed}`);

                    http.get(`${calcBaseUrl}/${calcPath}?id=${uniqueCalcId}`, (resp) => {
                      let data = '';

                      // A chunk of data has been recieved.
                      resp.on('data', (chunk) => {
                        data += chunk;
                      });

                      // The whole response has been received. Print out the result.
                      resp.on('end', () => {
                        // console.log(JSON.parse(data).explanation);
                        callback(null, {
                          message: 'Upload completed. Calculation started.',
                          input: `${s3UrlBase}/${calcBucket}/${calcDataContainer}/${fileToBeAnalyzed}`,
                          status: `${s3UrlBase}/${calcBucket}/${calcDataContainer}/${statusOfCalculation}`,
                          results: `${s3UrlBase}/${calcBucket}/${calcDataContainer}/${fileOfResults}`,
                        });
                      });
                    }).on("error", (err) => {
                      callback(err);
                    });
                  });

                  /*
                  AWS.config.credentials.get(function(err){
                    if (err) {return callback(err)}
                    uploadToS3(params);
                  });
                  // */
                  // callback(null, results);
                }
              });
          } else {
            callback(null, null);
          }
        },
      );
    });
  };

  MultimediaAnnotation.remoteMethod('dailyFirstCaptured', {
    http: { path: '/daily-first-captured', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
  });

  MultimediaAnnotation.dailyFirstCaptured = function(data, req, callback) {
    /* eslint-disable */
    MultimediaAnnotation.getDataSource().connector.connect(async (err, db) => {
      if (err) return callback(err);

      console.log(req.session);

      /* 測試計畫1
      {
        "projectId": "d8064aa7-9643-44fb-bed9-1f23a690f968",
        "site": "臺東處",
        "subSite": "NULL",
        "species": "山羌",
        "fromDateTime": "2018-01-01 00:00:00",
        "toDateTime": "2018-03-31 23:59:59"
      }
      // */
      const mdl = db.collection('MultimediaAnnotation');

      const toMatch = {};

      const { projectId, projectTitle, site, subSite, species, fullCameraLocationMd5s } = data;
      if (projectId) {
        toMatch.projectId = projectId;
      } else {
        return callback(new Error());
      }

      if (site) {
        toMatch.site = site;
      } else {
        return callback(new Error());
      }

      if (subSite) {
        toMatch.subSite = subSite;
      }

      if (
        Array.isArray(fullCameraLocationMd5s) &&
        fullCameraLocationMd5s.length > 0
      ) {
        toMatch.fullCameraLocationMd5 = { $in: fullCameraLocationMd5s };
      }

      const fromDateTime = new Date(data.fromDateTime + '+8').getTime() / 1000;
      const toDateTime = new Date(data.toDateTime + '+8').getTime() / 1000;
      toMatch.date_time_corrected_timestamp = {
        $gte: fromDateTime,
        $lte: toDateTime,
      };

      const secInDay = 24 * 60 * 60;
      const offset = -8 * 60 * 60;

      function anyDateTimeToDayStartTimestamp(currentDateTime, isTimestamp = false) {
        // 換算為 +8 時區的 timestamp
        let currentTimestamp;
        if (!isTimestamp) {
          currentTimestamp = new Date(currentDateTime + '+8').getTime() / 1000;
        }
        else {
          currentTimestamp = currentDateTime;
        }
        // console.log(currentTimestamp);
        const dayStartTimestamp =
          Math.floor((currentTimestamp - offset) / secInDay) * secInDay +
          offset;
        // console.log(dayStartTimestamp);
        return dayStartTimestamp;
      }

      // 起始日零時 與 結束日零時
      const fromDateZeroTimestamp = anyDateTimeToDayStartTimestamp(fromDateTime, true);
      const toDateZeroTimestamp = anyDateTimeToDayStartTimestamp(toDateTime, true);

      const everyDayFirstCaptured = {};
      console.log([fromDateZeroTimestamp, toDateZeroTimestamp]);


      let cameraLocations = await mdl.aggregate(
        [
          {
            $match: toMatch
          },
          {
            $group: {
              _id: "$fullCameraLocationMd5",
              cameraLocation: {$first: "$cameraLocation"}
            }
          }
        ],
        {},
      ).toArray();


      console.log(cameraLocations);

      // 填滿使用者設定時間範圍的每日零時
      for (let dateZeroTimestamp = fromDateZeroTimestamp; dateZeroTimestamp <= toDateZeroTimestamp; dateZeroTimestamp += secInDay) {
        cameraLocations.forEach(loc => {
          if (!everyDayFirstCaptured[dateZeroTimestamp]) everyDayFirstCaptured[dateZeroTimestamp] = {};
          const dateZero = new Date((dateZeroTimestamp - offset) * 1000); // 修正回 +8 時區
          everyDayFirstCaptured[dateZeroTimestamp][loc._id] = {
            projectId,
            projectTitle,
            site,
            subSite,
            dateZeroTimestamp,
            date: `${dateZero.getUTCFullYear()}-${leadingZero(dateZero.getUTCMonth() + 1)}-${leadingZero(dateZero.getUTCDate())}`,
            dailyFirstCapturedTimestamp: null,
            dailyFirstCapturedDateTime: null,
            cameraLocation: loc.cameraLocation,
            diff: null,
            dailyFirstCapturedText: "沒有照片"
          };
        });
      }

      // console.log(everyDayFirstCaptured);

      if (species) {
        toMatch['tokens.data.key'] = 'species';
        toMatch['tokens.data.value'] = species;
      } else {
        return callback(new Error());
      }

      console.log(JSON.stringify(toMatch));
      let matched = await mdl.find(
        toMatch,
        {
          projection: {
            fullCameraLocationMd5: true,
            date_time_corrected_timestamp: true,
            corrected_date_time: true
          },
          sort: {
            date_time_corrected_timestamp: 1
          }
        }
      ).toArray();

      matched.forEach(m => {
        let dataDateZeroTimestamp = anyDateTimeToDayStartTimestamp(m.date_time_corrected_timestamp, true);
        if (everyDayFirstCaptured[dataDateZeroTimestamp][m.fullCameraLocationMd5].diff === null) {
          let diff = m.date_time_corrected_timestamp - dataDateZeroTimestamp;
          everyDayFirstCaptured[dataDateZeroTimestamp][m.fullCameraLocationMd5].dailyFirstCapturedTimestamp = m.date_time_corrected_timestamp;
          everyDayFirstCaptured[dataDateZeroTimestamp][m.fullCameraLocationMd5].dailyFirstCapturedDateTime = m.corrected_date_time;
          everyDayFirstCaptured[dataDateZeroTimestamp][m.fullCameraLocationMd5].diff = diff;
          let hour = Math.floor(diff / 3600);
          let min = Math.floor((diff % 3600) / 60);
          let sec = Math.floor((diff % 3600) % 60);
          let dailyFirstCapturedText = `${hour}小時${min}分${sec}秒`;
          everyDayFirstCaptured[dataDateZeroTimestamp][m.fullCameraLocationMd5].dailyFirstCapturedText = dailyFirstCapturedText;
          console.log(dataDateZeroTimestamp);
        }
      });

      let locationDailyFirstCaptured = {}
      let locationIdToFullName = {}
      let locations;
      Object.keys(everyDayFirstCaptured).map(ts => {
        if (!locations) {
          locations = Object.keys(everyDayFirstCaptured[ts]);
        }
        locations.map(loc => {
          if (!locationDailyFirstCaptured[loc]) locationDailyFirstCaptured[loc] = [];
          locationDailyFirstCaptured[loc].push(everyDayFirstCaptured[ts][loc]);
          if (!locationIdToFullName[loc])
            locationIdToFullName[loc] = `${everyDayFirstCaptured[ts][loc].projectId}/${everyDayFirstCaptured[ts][loc].site}/${everyDayFirstCaptured[ts][loc].subSite}/${everyDayFirstCaptured[ts][loc].cameraLocation}`;
        })
      })

      callback(null, {locMap: locationIdToFullName, locationDailyFirstCaptured});

    });
  }

  MultimediaAnnotation.afterRemote('bulkInsert', addRevision); // tested
  MultimediaAnnotation.afterRemote('bulkReplace', addRevision); // tested
  MultimediaAnnotation.afterRemote('bulkUpdate', addRevision); // tested

  MultimediaAnnotation.disableRemoteMethodByName('upsert'); // disables PATCH /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('find'); // disables GET /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('replaceOrCreate'); // disables PUT /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('create'); // disables POST /MultimediaAnnotation

  MultimediaAnnotation.disableRemoteMethodByName('prototype.updateAttributes'); // disables PATCH /MultimediaAnnotation/{id}
  // MultimediaAnnotation.disableRemoteMethodByName("findById");                             // disables GET /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('exists'); // disables HEAD /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('replaceById'); // disables PUT /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('deleteById'); // disables DELETE /MultimediaAnnotation/{id}

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__get__accessTokens',
  ); // disable GET /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__create__accessTokens',
  ); // disable POST /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__delete__accessTokens',
  ); // disable DELETE /MultimediaAnnotation/{id}/accessTokens

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__findById__accessTokens',
  ); // disable GET /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__updateById__accessTokens',
  ); // disable PUT /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__destroyById__accessTokens',
  ); // disable DELETE /MultimediaAnnotation/{id}/accessTokens/{fk}

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__count__accessTokens',
  ); // disable  GET /MultimediaAnnotation/{id}/accessTokens/count

  MultimediaAnnotation.disableRemoteMethodByName('prototype.verify'); // disable POST /MultimediaAnnotation/{id}/verify
  MultimediaAnnotation.disableRemoteMethodByName('changePassword'); // disable POST /MultimediaAnnotation/change-password
  MultimediaAnnotation.disableRemoteMethodByName('createChangeStream'); // disable GET and POST /MultimediaAnnotation/change-stream

  MultimediaAnnotation.disableRemoteMethodByName('confirm'); // disables GET /MultimediaAnnotation/confirm
  MultimediaAnnotation.disableRemoteMethodByName('count'); // disables GET /MultimediaAnnotation/count
  MultimediaAnnotation.disableRemoteMethodByName('findOne'); // disables GET /MultimediaAnnotation/findOne

  MultimediaAnnotation.disableRemoteMethodByName('login'); // disables POST /MultimediaAnnotation/login
  MultimediaAnnotation.disableRemoteMethodByName('logout'); // disables POST /MultimediaAnnotation/logout

  MultimediaAnnotation.disableRemoteMethodByName('resetPassword'); // disables POST /MultimediaAnnotation/reset
  MultimediaAnnotation.disableRemoteMethodByName('setPassword'); // disables POST /MultimediaAnnotation/reset-password
  MultimediaAnnotation.disableRemoteMethodByName('update'); // disables POST /MultimediaAnnotation/update
  MultimediaAnnotation.disableRemoteMethodByName('upsertWithWhere'); // disables POST /MultimediaAnnotation/upsertWithWhere
};
