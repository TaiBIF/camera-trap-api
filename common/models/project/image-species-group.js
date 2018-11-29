module.exports = ({ data, req, res, db }) => {
  const { projectId } = data;
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

  if (projectId) {
    toMatch.projectId = projectId;
  } else {
    return res(new Error('請輸入 projectId'));
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
          projectId: '$projectId',
          // eslint-disable-next-line
          species_shortcut: '$tokens.species_shortcut',
        },
        count: {
          $sum: 1,
        },
        species: { $first: '$tokens.species_shortcut' },
        projectTitle: { $first: '$projectTitle' },
        projectId: { $first: '$projectId' },
        modified: { $max: '$modified' },
      },
    },
    {
      $group: {
        _id: null,
        // eslint-disable-next-line
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
        // eslint-disable-next-line
        species_group: '$species_group',
        total: '$total',
        modified: '$modified',
      },
    },
  ];

  mma.aggregate(aggregateQuery).toArray((_err, speciesImageCount) => {
    if (_err) {
      res(_err);
    } else if (speciesImageCount.length === 0) {
      speciesImageCount = [
        {
          // eslint-disable-next-line
          species_group: [],
          total: 0,
          modified: null,
        },
      ];
      res(null, speciesImageCount);
    }
  });
};
