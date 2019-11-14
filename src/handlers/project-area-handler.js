const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const UserPermission = require('../models/const/user-permission');
const ProjectAreaModel = require('../models/data/project-area-model');
const ProjectAreasSearchForm = require('../forms/project-area/project-areas-search-form');
const AreaType = require('../models/const/area-type');

exports.getProjectAreas = auth(UserPermission.all(), async (req, res) => {
  /*
  GET /api/v1/project-areas
   */
  const form = new ProjectAreasSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectAreaModel.where().sort(form.sort);
  // north
  let northCount = 0;
  const northSum = await ProjectAreaModel.where({ type: AreaType.north });
  northSum.forEach(north => {
    northCount += north.dataCount;
  });

  // south
  let southCount = 0;
  const southSum = await ProjectAreaModel.where({ type: AreaType.south });
  southSum.forEach(south => {
    southCount += south.dataCount;
  });

  // east
  let eastCount = 0;
  const eastSum = await ProjectAreaModel.where({ type: AreaType.east });
  eastSum.forEach(east => {
    eastCount += east.dataCount;
  });

  // west
  let westCount = 0;
  const westSum = await ProjectAreaModel.where({ type: AreaType.west });
  westSum.forEach(west => {
    westCount += west.dataCount;
  });

  return ProjectAreaModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(result => {
    const data = new PageList(
      form.index,
      form.size,
      result.totalDocs,
      result.docs,
    );
    data.location = {
      north: northCount,
      south: southCount,
      east: eastCount,
      west: westCount,
    };
    res.json(data);
  });
});
