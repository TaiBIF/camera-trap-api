const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ForestBoundaryModel = require('../models/data/forest-compartment-boundary-model');
const ForestBoundaryForm = require('../forms/forest-compartment-boundary/forest-compartment-boundary-form');

exports.getForestCompartmentBoundary = auth(
  UserPermission.all(),
  (req, res) => {
    /*
    POST /api/v1/forest-compartment-boundaryy
     */
    const form = new ForestBoundaryForm(req.query);
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }

    // const query = ForestBoundaryModel.find();
    const query = ForestBoundaryModel.find({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [form.decimalLongitude, form.decimalLatitude],
          },
        },
      },
    });

    return ForestBoundaryModel.paginate(query, {
      offset: form.index * form.size,
      limit: form.size,
    }).then(result => {
      res.json(
        new PageList(form.index, form.size, result.totalDocs, result.docs),
      );
    });
  },
);
