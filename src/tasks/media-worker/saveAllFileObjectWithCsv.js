const Promise = require('bluebird');
const moment = require('moment-timezone');
const AnnotationModel = require('../../models/data/annotation-model');
const AnnotationState = require('../../models/const/annotation-state');
const SpeciesModel = require('../../models/data/species-model');

const dataTimeZone = 'Asia/Taipei';
const fileNameIndex = 3;
const saveAnnotationConcurrency = 6;

const rawDataToObject = (csvArray, dataFields) => {
  const csvHeaderRow = csvArray[0];
  const csvContentRows = csvArray.slice(1);

  const annotationIndex = csvHeaderRow.findIndex(
    row => row === 'Annotation id',
  );

  const indexes = {};

  dataFields.forEach(({ _id, title: { 'zh-TW': CName } }) => {
    const index = csvHeaderRow.findIndex(row => row === CName);
    if (index) {
      indexes[_id] = index;
    }
  });

  const rawData = csvContentRows.map(raw => {
    const data = {
      cameraLocation: raw[2],
      fileName: raw[fileNameIndex],
      time: raw[4],
      species: raw[5],
      annotationId: raw[annotationIndex],
      origin: raw,
    };

    Object.keys(indexes).forEach(id => {
      data[id] = raw[indexes[id]];
    });
    return data;
  });

  return rawData;
};

module.exports = async (
  csvArray,
  files,
  project,
  user,
  cameraLocation,
  startWorkingDate,
  endWorkingDate,
) => {
  const { dataFields } = project;
  const species = await SpeciesModel.where();
  const csvContentRows = rawDataToObject(csvArray, dataFields);

  await Promise.resolve(csvContentRows).map(
    row => {
      const data = row;

      // 組 fields
      const fields = dataFields.map(({ _id, options }) => {
        const tempValue = data[_id];
        let value = {};

        if (options.length) {
          const option =
            options.find(
              opt =>
                `${opt._id}` === tempValue || `${opt['zh-TW']}` === tempValue,
            ) || {};

          value = {
            selectId: option._id,
            text: option._id || tempValue,
            selectLabel: option['zh-TW'],
          };
        } else {
          value = {
            text: tempValue,
          };
        }

        return {
          dataField: _id,
          value,
        };
      });

      const annotationSpecies = species.find(
        x => x.title['zh-TW'] === data.species,
      );

      const annotation = new AnnotationModel();
      annotation.project = project;
      annotation.studyArea = cameraLocation.studyArea;
      annotation.cameraLocation = cameraLocation;
      annotation.filename = data.fileName;
      annotation.time = moment.tz(data.time, dataTimeZone).toISOString();
      annotation.file = files[data.fileName];
      annotation.state = AnnotationState.active;
      annotation.species = annotationSpecies || null;
      annotation.failures = annotation.species === null ? ['new-species'] : [];
      annotation.fields = fields;
      annotation.rawData = data.origin;
      annotation.startWorkingDate = startWorkingDate;
      annotation.endWorkingDate = endWorkingDate;
      annotation.saveAndAddRevision(user);
      return annotation;
    },
    { concurrency: saveAnnotationConcurrency },
  );
};
