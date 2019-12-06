const bluebird = require('bluebird');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CityCompartmentBoundaryModel = require('../../models/data/city-compartment-boundary-model');
const citys = require('./city-geo');

citys.features = citys.features.map(row => ({
  type: row.type,
  geometry: row.geometry,
  properties: {
    name: row.properties['名稱'],
    scale: row.properties['比例尺分母'],
    areaCode: row.properties['行政區域代碼'],
  },
}));

//
const execFn = async () => {
  await CityCompartmentBoundaryModel.collection.drop();
  await CityCompartmentBoundaryModel.createIndexes();

  const cityCompartmentBoundary = await CityCompartmentBoundaryModel.insertMany(
    citys.features,
  );
  console.log('cityCompartmentBoundary', cityCompartmentBoundary);

  const cameraLocations = await CameraLocationModel.find();
  console.log('cameraLocations', cameraLocations);

  await bluebird.map(
    cameraLocations,
    async cameraLocation => {
      try {
        await cameraLocation.updateCity();
      } catch (error) {
        console.log('error', error);
      }

      return cameraLocation;
    },
    { concurrency: 10 },
  );
};

execFn()
  .then(res => {
    console.log('res', res);
    console.log('done');
  })
  .catch(err => {
    console.error('err', err);
    console.log('done');
  });
