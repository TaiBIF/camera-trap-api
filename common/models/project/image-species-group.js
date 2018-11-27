module.exports = ({ data, req, callback, db }) => {
  const { projectTitle } = data;
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

  if (projectTitle) {
    toMatch.projectTitle = projectTitle;
  } else {
    return callback(new Error('請輸入計畫名稱'));
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
          projectTitle: '$projectTitle',
          species_shortcut: '$tokens.species_shortcut',
        },
        count: {
          $sum: 1,
        },
        species: { $first: '$tokens.species_shortcut' },
        projectTitle: { $first: '$projectTitle' },
        modified: { $max: '$modified' },
      },
    },
    {
      $group: {
        _id: null,
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
        species_group: '$species_group',
        total: '$total',
        modified: '$modified',
      },
    },
  ];

  mma.aggregate(aggregateQuery).toArray((_err, speciesImageCount) => {
    if (_err) {
      callback(_err);
    } else if (speciesImageCount.length === 0) {
      speciesImageCount = [
        {
          species_group: [],
          total: 0,
          modified: null,
        },
      ];
      callback(null, speciesImageCount);
    }
  });
};
