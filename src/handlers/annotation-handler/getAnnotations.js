const moment = require('moment-timezone');
const { keyBy } = require('lodash');
const xlsx = require('node-xlsx');
const errors = require('../../models/errors');
const PageList = require('../../models/page-list');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const DataFieldModel = require('../../models/data/data-field-model');
const DataFieldWidgetType = require('../../models/const/data-field-widget-type');
const DataFieldState = require('../../models/const/data-field-state');
const StudyAreaModel = require('../../models/data/study-area-model');
const StudyAreaState = require('../../models/const/study-area-state');
const ProjectTripModel = require('../../models/data/project-trip-model');
const AnnotationsSearchForm = require('../../forms/annotation/annotations-search-form');
const Helpers = require('../../common/helpers.js');

const fetchDataField = async fields => {
  const dataFields = await DataFieldModel.where({
    _id: { $in: Object.keys(fields) },
    state: DataFieldState.approved,
  });

  if (Object.keys(fields).length !== dataFields.length) {
    throw new errors.Http400('Some data fields are not found.');
  }

  return dataFields;
};

const fetchCameraLocations = async (formCameraLocations, reqUser) => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: formCameraLocations },
  })
    .where({ state: CameraLocationState.active })
    .populate('studyArea')
    .populate('project');

  if (formCameraLocations.length !== cameraLocations.length) {
    throw new errors.Http404();
  }

  cameraLocations.forEach(cameraLocation => {
    if (!cameraLocation.project.canAccessBy(reqUser)) {
      throw new errors.Http403();
    }
  });
  return cameraLocations;
};

const fetchProjectTripId = async projectTripId => {
  const cameraLocations = await ProjectTripModel.where({
    _id: projectTripId,
  });
  if (cameraLocations) {
    const result = [];
    cameraLocations.forEach(project =>
      // eslint-disable-next-line no-shadow
      project.studyAreas.forEach(studyArea =>
        studyArea.cameraLocations.forEach(cameraLocation =>
          result.push(cameraLocation),
        ),
      ),
    );
    return result;
  }
  return null;
};

const fetchChildAreas = studyAreaId =>
  StudyAreaModel.where({
    parent: studyAreaId,
  }).where({
    state: StudyAreaState.active,
  });

const fetchStudyArea = async (studyAreaId, user) => {
  const studyArea = await StudyAreaModel.findById(studyAreaId)
    .where({ state: StudyAreaState.active })
    .populate('project');

  if (!studyArea) {
    throw new errors.Http404();
  }

  if (!studyArea.project.canAccessBy(user)) {
    throw new errors.Http403();
  }

  return studyArea;
};

const getExtraFields = (form, dataFields) => {
  // 進階篩選 DataField
  const dataFieldFilters = [];
  dataFields.forEach(dataField => {
    let date;
    switch (dataField.widgetType) {
      case DataFieldWidgetType.time:
        date = new Date(form.fields[`${dataField._id}`]);
        if (Number.isNaN(date.getTime())) {
          throw new errors.Http400(
            `The value "${form.fields[`${dataField._id}`]}" of field ${
              dataField._id
            } should be a date.`,
          );
        }
        dataFieldFilters.push({
          fields: {
            $elemMatch: {
              dataField: dataField._id,
              'value.time': new Date(form.fields[`${dataField._id}`]),
            },
          },
        });
        break;
      case DataFieldWidgetType.select:
        if (
          !dataField.options.find(
            x => `${x._id}` === form.fields[`${dataField._id}`],
          )
        ) {
          throw new errors.Http400(
            `The option ${form.fields[`${dataField._id}`]} not in the field ${
              dataField._id
            }.`,
          );
        }
        dataFieldFilters.push({
          fields: {
            $elemMatch: {
              dataField: dataField._id,
              'value.selectId': form.fields[`${dataField._id}`],
            },
          },
        });
        break;
      case DataFieldWidgetType.text:
      default:
        dataFieldFilters.push({
          fields: {
            $elemMatch: {
              dataField: dataField._id,
              'value.text': form.fields[`${dataField._id}`],
            },
          },
        });
    }
  });
  return dataFieldFilters;
};

const getAnnotationQuery = (
  form,
  studyArea,
  childStudyAreas = [],
  cameraLocations = [],
  projectTrips = null,
  dataFields,
  synonymSpeciesIds,
) => {
  const query = AnnotationModel.where({ state: AnnotationState.active })
    .populate('species')
    .populate('file')
    .sort(form.sort);

  if (studyArea) {
    query.where({
      studyArea: { $in: [studyArea._id, ...childStudyAreas.map(x => x._id)] },
    });
  }

  if (cameraLocations.length) {
    if (projectTrips) {
      if (projectTrips.length) {
        query.where({
          $and: [
            {
              cameraLocation: { $in: projectTrips.map(x => x.cameraLocation) },
            },
            {
              cameraLocation: { $in: cameraLocations.map(x => x._id) },
            },
          ],
        });
      } else {
        throw new errors.Http400('The project not have cameraLocation');
      }
    } else {
      query.where({
        cameraLocation: { $in: cameraLocations.map(x => x._id) },
      });
    }
  }

  if (form.uploadSession) {
    query.where({ uploadSession: form.uploadSession });
  }

  if (form.startTime) {
    query.where({ time: { $gte: form.startTime } });
  }

  if (form.endTime) {
    query.where({ time: { $lte: form.endTime } });
  }

  if (form.timeRangeStart != null) {
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const duration = form.timeRangeEnd - form.timeRangeStart;
    let { timeRangeStart } = form;
    if (form.timeRangeStart < 0) {
      // The time is offset to the previous day.
      timeRangeStart += dayInMilliseconds;
    } else if (form.timeRangeStart >= dayInMilliseconds) {
      // The time is offset to the next day.
      timeRangeStart -= dayInMilliseconds;
    }

    if (timeRangeStart + duration >= dayInMilliseconds) {
      query.where({
        $or: [
          { totalMilliseconds: { $gte: timeRangeStart } },
          {
            totalMilliseconds: {
              $lte: timeRangeStart + duration - dayInMilliseconds,
            },
          },
        ],
      });
    } else {
      query.where({
        $and: [
          { totalMilliseconds: { $gte: timeRangeStart } },
          { totalMilliseconds: { $lte: timeRangeStart + duration } },
        ],
      });
    }
  }

  const extraFields = getExtraFields(form, dataFields);
  if (extraFields.length > 0) {
    query.where({ $and: extraFields });
  }

  return query;
};

/**
  GET /api/v1/annotations
  GET /api/v1/annotations.csv
*/
module.exports = async (req, res) => {
  const form = new AnnotationsSearchForm(req.query);
  const errorMessage = form.validate();

  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  if (!form.studyArea && !form.cameraLocations.length) {
    throw new errors.Http400(
      'studyArea and cameraLocations least one should be not empty.',
    );
  }

  if (form.timeRangeStart != null && form.timeRangeEnd == null) {
    throw new errors.Http400('timeRangeEnd is required.');
  }
  if (form.timeRangeEnd != null && form.timeRangeStart == null) {
    throw new errors.Http400('timeRangeStart is required.');
  }
  const { studyArea: studyAreaId } = form;

  let [studyArea, childStudyAreas, cameraLocations, projectTrips] = [];

  if (studyAreaId) {
    studyArea = await fetchStudyArea(studyAreaId, req.user);
    childStudyAreas = await fetchChildAreas(studyAreaId);
  }

  if (form.cameraLocations.length) {
    cameraLocations = await fetchCameraLocations(
      form.cameraLocations,
      req.user,
    );
  }

  if (form.projectTripId) {
    projectTrips = await fetchProjectTripId(form.projectTripId);
  }

  const synonymSpeciesIds = await Helpers.findSynonymSpecies(form.species);
  const dataFields = await fetchDataField(form.fields);

  const offset = form.index * form.size;
  const annotationQuery = getAnnotationQuery(
    form,
    studyArea,
    childStudyAreas || [],
    cameraLocations,
    projectTrips,
    dataFields,
    synonymSpeciesIds,
  );

  const annotations = await AnnotationModel.paginate(annotationQuery, {
    offset,
    limit: form.size,
  });

  const speciesField = await DataFieldModel.findOne({
    systemCode: 'species',
  });

  const annotationDocs = annotations.docs.map(a => {
    const data = Object.assign({}, a.dump());
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

  const cameraLocation = cameraLocations[0];
  const { project } = cameraLocation;
  const pDataFields = project.dataFields;
  const fieldsObjects = await DataFieldModel.find({
    _id: { $in: pDataFields },
  });

  const headers = [];
  fieldsObjects.forEach(f => {
    if (f.title['zh-TW'] === '樣區') {
      headers.push('樣區');
      headers.push('子樣區');
    } else {
      headers.push(f.title['zh-TW']);
    }
  });

  let parentArea;
  if (cameraLocation.studyArea.parent) {
    const { parent: parentId } = cameraLocation.studyArea;
    parentArea = await StudyAreaModel.findById(parentId);
  }

  const xlsxData = [];

  annotationDocs.forEach(a => {
    const t = moment(a.time, 'Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    const annotationFields = keyBy(a.fields, 'dataField');
    const rowData = [];
    fieldsObjects.forEach(f => {
      const key = f.title['en-US'];
      switch (key) {
        case 'Study area':
          // 樣區
          if (parentArea) {
            rowData.push(`${parentArea.title['zh-TW']}`);
            rowData.push(`${cameraLocation.studyArea.title['zh-TW']}`);
          } else {
            rowData.push(`${cameraLocation.studyArea.title['zh-TW']}`);
            rowData.push(''); // 沒有子樣區
          }
          break;
        case 'Camera Location':
          rowData.push(`${cameraLocation.name}`);
          break;
        case 'File name':
          rowData.push(`${a.filename}`);
          break;
        case 'Date and time':
          rowData.push(`${t}`);
          break;
        case 'Species':
          rowData.push(`${a.species ? a.species.title['zh-TW'] : ''}`);
          break;
        default:
          if (f.widgetType === 'select') {
            const options = keyBy(f.options, '_id');
            const value = annotationFields[f._id]
              ? annotationFields[f._id].value || ''
              : '';
            rowData.push(
              value ? `${options[value] ? options[value]['zh-TW'] : ''}` : '',
            );
          } else {
            rowData.push(
              `${
                annotationFields[f._id]
                  ? annotationFields[f._id].value || ''
                  : ''
              }`,
            );
          }
          break;
      }
    });
    rowData.push(`${a.id}`);
    xlsxData.push(rowData);
  });

  headers.push('Annotation id');
  xlsxData.unshift(headers);
  res.setHeader('Content-disposition', 'attachment; filename=export.xlsx');
  res.setHeader(
    'Content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
  );
  const buffer = xlsx.build([{ name: 'annotations', data: xlsxData }]);
  res.end(buffer);
};
