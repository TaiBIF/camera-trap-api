// const reformatSpeciesTimeSeries = require('./_reformatSpeciesTimeSeries');

// test('adds 1 + 2 to equal 3', () => {
//   const inputData = [
//     {
//       month: 8,
//       year: 2015,
//       species: '測試',
//       speciesId: '5cd661e332a98b60839c6cab',
//       numberOfRecords: 54,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 9,
//       year: 2015,
//       species: '山羌',
//       speciesId: '5cd661e332a98b60839c6caf',
//       numberOfRecords: 1408,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 10,
//       year: 2015,
//       species: '山羌',
//       speciesId: '5cd661e332a98b60839c6caf',
//       numberOfRecords: 2497,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 11,
//       year: 2015,
//       species: '空拍',
//       speciesId: '5cd661e332a98b60839c6caa',
//       numberOfRecords: 3481,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 9,
//       year: 2015,
//       species: '空拍',
//       speciesId: '5cd661e332a98b60839c6caa',
//       numberOfRecords: 45,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 9,
//       year: 2015,
//       species: '測試',
//       speciesId: '5cd661e332a98b60839c6cab',
//       numberOfRecords: 3055,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 10,
//       year: 2015,
//       species: '獼猴',
//       speciesId: '5cd661e332a98b60839c6cb1',
//       numberOfRecords: 423,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 9,
//       year: 2015,
//       species: '獼猴',
//       speciesId: '5cd661e332a98b60839c6cb1',
//       numberOfRecords: 201,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 12,
//       year: 2015,
//       species: '山羌',
//       speciesId: '5cd661e332a98b60839c6caf',
//       numberOfRecords: 2860,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 10,
//       year: 2015,
//       species: '鼬獾',
//       speciesId: '5cd661e332a98b60839c6cb2',
//       numberOfRecords: 434,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 11,
//       year: 2015,
//       species: '獼猴',
//       speciesId: '5cd661e332a98b60839c6cb1',
//       numberOfRecords: 424,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 11,
//       year: 2015,
//       species: '山羌',
//       speciesId: '5cd661e332a98b60839c6caf',
//       numberOfRecords: 2480,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 9,
//       year: 2015,
//       species: '鼬獾',
//       speciesId: '5cd661e332a98b60839c6cb2',
//       numberOfRecords: 335,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 12,
//       year: 2015,
//       species: '測試',
//       speciesId: '5cd661e332a98b60839c6cab',
//       numberOfRecords: 1910,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 11,
//       year: 2015,
//       species: '測試',
//       speciesId: '5cd661e332a98b60839c6cab',
//       numberOfRecords: 1944,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 8,
//       year: 2015,
//       species: '鼬獾',
//       speciesId: '5cd661e332a98b60839c6cb2',
//       numberOfRecords: 81,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 10,
//       year: 2015,
//       species: '空拍',
//       speciesId: '5cd661e332a98b60839c6caa',
//       numberOfRecords: 279,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 12,
//       year: 2015,
//       species: '獼猴',
//       speciesId: '5cd661e332a98b60839c6cb1',
//       numberOfRecords: 471,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 11,
//       year: 2015,
//       species: '鼬獾',
//       speciesId: '5cd661e332a98b60839c6cb2',
//       numberOfRecords: 239,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 12,
//       year: 2015,
//       species: '鼬獾',
//       speciesId: '5cd661e332a98b60839c6cb2',
//       numberOfRecords: 178,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 12,
//       year: 2015,
//       species: '空拍',
//       speciesId: '5cd661e332a98b60839c6caa',
//       numberOfRecords: 249,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//     {
//       month: 10,
//       year: 2015,
//       species: '測試',
//       speciesId: '5cd661e332a98b60839c6cab',
//       numberOfRecords: 1944,
//       studyArea: '羅東處',
//       studyAreaId: '5ceb7925caaeca25bf2d55f1',
//     },
//   ];
//   console.log(reformatSpeciesTimeSeries(inputData));
//   expect(_reformatSpeciesTimeSeries(inputData)).toBe(3);
// });

/**
 * 

 [
    {
        "studyAreaId": "5ceb7925caaeca25bf2d55f1",
        "studyArea": "羅東處",
        "metrics": [
            {
                "year": 2015,
                "month": 1,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 2,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 3,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 4,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 5,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 6,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 7,
                "metrics": []
            },
            {
                "year": 2015,
                "month": 8,
                "metrics": [
                    {
                        "species": "測試",
                        "speciesId": "5cd661e332a98b60839c6cab",
                        "numberOfRecords": 54
                    },
                    {
                        "species": "鼬獾",
                        "speciesId": "5cd661e332a98b60839c6cb2",
                        "numberOfRecords": 81
                    }
                ]
            },
            {
                "year": 2015,
                "month": 9,
                "metrics": [
                    {
                        "species": "山羌",
                        "speciesId": "5cd661e332a98b60839c6caf",
                        "numberOfRecords": 1408
                    },
                    {
                        "species": "空拍",
                        "speciesId": "5cd661e332a98b60839c6caa",
                        "numberOfRecords": 45
                    },
                    {
                        "species": "測試",
                        "speciesId": "5cd661e332a98b60839c6cab",
                        "numberOfRecords": 3055
                    },
                    {
                        "species": "獼猴",
                        "speciesId": "5cd661e332a98b60839c6cb1",
                        "numberOfRecords": 201
                    },
                    {
                        "species": "鼬獾",
                        "speciesId": "5cd661e332a98b60839c6cb2",
                        "numberOfRecords": 335
                    }
                ]
            },
            {
                "year": 2015,
                "month": 10,
                "metrics": [
                    {
                        "species": "山羌",
                        "speciesId": "5cd661e332a98b60839c6caf",
                        "numberOfRecords": 2497
                    },
                    {
                        "species": "獼猴",
                        "speciesId": "5cd661e332a98b60839c6cb1",
                        "numberOfRecords": 423
                    },
                    {
                        "species": "鼬獾",
                        "speciesId": "5cd661e332a98b60839c6cb2",
                        "numberOfRecords": 434
                    },
                    {
                        "species": "空拍",
                        "speciesId": "5cd661e332a98b60839c6caa",
                        "numberOfRecords": 279
                    },
                    {
                        "species": "測試",
                        "speciesId": "5cd661e332a98b60839c6cab",
                        "numberOfRecords": 1944
                    }
                ]
            },
            {
                "year": 2015,
                "month": 11,
                "metrics": [
                    {
                        "species": "空拍",
                        "speciesId": "5cd661e332a98b60839c6caa",
                        "numberOfRecords": 3481
                    },
                    {
                        "species": "獼猴",
                        "speciesId": "5cd661e332a98b60839c6cb1",
                        "numberOfRecords": 424
                    },
                    {
                        "species": "山羌",
                        "speciesId": "5cd661e332a98b60839c6caf",
                        "numberOfRecords": 2480
                    },
                    {
                        "species": "測試",
                        "speciesId": "5cd661e332a98b60839c6cab",
                        "numberOfRecords": 1944
                    },
                    {
                        "species": "鼬獾",
                        "speciesId": "5cd661e332a98b60839c6cb2",
                        "numberOfRecords": 239
                    }
                ]
            },
            {
                "year": 2015,
                "month": 12,
                "metrics": [
                    {
                        "species": "山羌",
                        "speciesId": "5cd661e332a98b60839c6caf",
                        "numberOfRecords": 2860
                    },
                    {
                        "species": "測試",
                        "speciesId": "5cd661e332a98b60839c6cab",
                        "numberOfRecords": 1910
                    },
                    {
                        "species": "獼猴",
                        "speciesId": "5cd661e332a98b60839c6cb1",
                        "numberOfRecords": 471
                    },
                    {
                        "species": "鼬獾",
                        "speciesId": "5cd661e332a98b60839c6cb2",
                        "numberOfRecords": 178
                    },
                    {
                        "species": "空拍",
                        "speciesId": "5cd661e332a98b60839c6caa",
                        "numberOfRecords": 249
                    }
                ]
            }
        ]
    }
]
 */
