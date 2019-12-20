const { keyBy } = require('lodash');
const mongoose = require('mongoose');
const xlsx = require('node-xlsx');
const moment = require('moment-timezone');
const PageList = require('../../models/page-list');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const DataFieldModel = require('../../models/data/data-field-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
};

const fetchCustomDataFieldSelectMap = async () => {
  const customSelectDataFields = await DataFieldModel.find({
    systemCode: { $exists: false },
    widgetType: 'select',
  });

  return customSelectDataFields.reduce((r, e) => {
    const opt = e.options.reduce((ro, eo) => {
      ro[eo._id] = eo['zh-TW'];
      return ro;
    }, {});
    r[e._id] = opt;
    return r;
  }, {});
};

const getAnnotationQuery = form => {
  const query = AnnotationModel.where({ state: AnnotationState.active })
    .populate('species')
    .populate('studyArea')
    .populate('file')
    .sort('cameraLocation time filename');

  if (form.cameraLocationIds.length) {
    query.where({
      cameraLocation: { $in: form.cameraLocationIds },
    });
  }

  if (form.speciesIds.length) {
    query.where({
      species: {
        $in: form.speciesIds,
      },
    });
  }

  if (form.startDateTime) {
    query.where({ time: { $gte: form.startDateTime } });
  }

  if (form.endDateTime) {
    query.where({ time: { $lte: form.endDateTime } });
  }

  const otherDataFields = Object.keys(form);
  if (otherDataFields.length) {
    otherDataFields.forEach(dataFieldId => {
      if (!mongoose.Types.ObjectId.isValid(dataFieldId)) {
        return;
      }
      const dataFieldValue = form[dataFieldId];
      query.where({
        fields: {
          $elemMatch: {
            dataField: dataFieldId,
            'value.text': dataFieldValue,
          },
        },
      });
    });
  }

  return query;
};

/**
 * GET /api/v1/simple-annotations
 * GET /api/v1/simple-annotations.csv
 */
module.exports = async (req, res) => {
  const form = req.query;
  const { cameraLocationIds = [], index = 0 } = form;

  const cameraLocations = await fetchCameraLocations(cameraLocationIds);
  const cameraLocationsMapping = keyBy(cameraLocations, '_id');
  const annotationQuery = getAnnotationQuery(form);
  const offsetLimit = !/\.csv$/i.test(req.path)
    ? {
        offset: (index ? index - 1 : 0) * 500,
        limit: 500,
      }
    : {
        offset: 0,
        limit: 20000, // TODO csv 下載最高限制?
      };
  const annotations = await AnnotationModel.paginate(
    annotationQuery,
    offsetLimit,
  );

  const speciesField = await DataFieldModel.findOne({
    systemCode: 'species',
  });

  const customDataFieldSelectMap = await fetchCustomDataFieldSelectMap();

  // 整理 annotations
  const annotationDocs = annotations.docs.map(a => {
    const data = Object.assign({}, a.dump());

    // format camera locations
    const cameraLocationInfo =
      cameraLocationsMapping[data.cameraLocation] || {};
    data.cameraLocation = {
      name: cameraLocationInfo.name || '',
      id: cameraLocationInfo.id || '',
    };

    // format study area
    data.studyArea = {
      id: data.studyArea._id,
      title: data.studyArea.title,
    };

    // format species
    if (a.species === null) {
      const speciesTitle = data.fields.find(
        f => f.dataField.toString() === speciesField._id.toString(),
      );

      data.species = {
        title: {
          'zh-TW': speciesTitle.value ? speciesTitle.value || '' : '',
        },
      };
    }

    // convert custom fields text value to label
    data.fields = data.fields.map(x => {
      const v = Object.prototype.hasOwnProperty.call(
        customDataFieldSelectMap,
        x.dataField,
      )
        ? customDataFieldSelectMap[x.dataField][x.value]
        : x.value;

      return {
        dataField: x.dataField,
        value: v,
      };
    });
    return data;
  });

  if (!/\.csv$/i.test(req.path)) {
    res.json(
      new PageList(
        form.index,
        form.size,
        annotations.totalDocs,
        annotationDocs,
      ),
    );
    return;
  }
  // res.json(
  //  new PageList(form.index, form.size, annotations.totalDocs, annotationDocs),
  // );
  const headers = ['樣區', '相機位置', '檔名', '時間', '物種']; // TODO: other fields, consider, mix multiple project

  const xlsxData = annotationDocs.map(a => {
    const rowData = [];
    rowData.push(`${a.studyArea.title['zh-TW']}`);
    rowData.push(`${a.cameraLocation.name}`);
    rowData.push(`${a.filename}`);
    const t = moment(a.time, 'Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    rowData.push(`${t}`);
    rowData.push(`${a.species ? a.species.title['zh-TW'] : ''}`);
    return rowData;
  });
  xlsxData.unshift(headers);
  res.setHeader('Content-disposition', 'attachment; filename=annotations.xlsx');
  res.setHeader(
    'Content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
  );
  const buffer = xlsx.build([{ name: 'annotations', data: xlsxData }]);
  res.end(buffer);
};
