const optimist = require('optimist');
const pLimit = require('p-limit');

const op = optimist
  .usage(
    `
The Camera Trap API command line tool.
Usage: node . -c`,
  )
  .options('c', {
    alias: 'createCollections',
  })
  .describe('c', 'Create collections and indexes of all models.')
  .options('i', {
    alias: 'insertData',
  })
  .describe('i', 'Insert database default data.');

if (op.argv.createCollections) {
  // Create collections and indexes of all models.
  const models = require('./src/models/data').allModels;
  const limit = pLimit(1);

  Promise.all(
    models.map(model =>
      limit(() => {
        console.log(`Create: ${model.modelName}`);
        return model.createIndexes();
      }),
    ),
  ).then(() => {
    process.exit(0);
  });
} else if (op.argv.insertData) {
  // Insert database default data.
  const limit = pLimit(1);
  const DataFieldModel = require('./src/models/data/data-field-model');
  const DataFieldSystemCode = require('./src/models/const/data-field-system-code');
  const DataFieldWidgetType = require('./src/models/const/data-field-widget-type');
  const DataFieldState = require('./src/models/const/data-field-state');
  const ProjectAreaModel = require('./src/models/data/project-area-model');

  const data = [
    new DataFieldModel({
      // 欄位：樣區
      systemCode: DataFieldSystemCode.studyArea,
      title: {
        'zh-TW': '樣區',
      },
      description: {
        'zh-TW': '樣區-子樣區',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：相機位置
      systemCode: DataFieldSystemCode.cameraLocation,
      title: {
        'zh-TW': '相機位置',
      },
      description: {
        'zh-TW': '相機位置名稱',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：檔名
      systemCode: DataFieldSystemCode.fileName,
      title: {
        'zh-TW': '檔名',
      },
      description: {
        'zh-TW': '01234.jpg',
      },
      widgetType: DataFieldWidgetType.text,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：日期時間
      systemCode: DataFieldSystemCode.time,
      title: {
        'zh-TW': '日期時間',
      },
      description: {
        'zh-TW': 'YY/MM/DD hh:mm',
      },
      widgetType: DataFieldWidgetType.time,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      systemCode: DataFieldSystemCode.species,
      title: {
        'zh-TW': '物種',
      },
      description: {
        'zh-TW': '',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：性別
      title: {
        'zh-TW': '性別',
      },
      description: {
        'zh-TW': '公、母',
      },
      options: [
        {
          'zh-TW': '公',
        },
        {
          'zh-TW': '母',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：年齡
      title: {
        'zh-TW': '年齡',
      },
      description: {
        'zh-TW': '成體、亞成體、幼體',
      },
      options: [
        {
          'zh-TW': '成體',
        },
        {
          'zh-TW': '亞成體',
        },
        {
          'zh-TW': '幼體',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：備註
      title: {
        'zh-TW': '備註',
      },
      description: {
        'zh-TW': '',
      },
      widgetType: DataFieldWidgetType.text,
      state: DataFieldState.approved,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台北市', 'en-US': 'Taipei City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新北市', 'en-US': 'New Taipei City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '桃園市', 'en-US': 'Taoyuan City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台中市', 'en-US': 'Taichung City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台南市', 'en-US': 'Tainan City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '高雄市', 'en-US': 'Kaohsiung City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '基隆市', 'en-US': 'Keelung City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新竹市', 'en-US': 'Hsinchu City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '嘉義市', 'en-US': 'Chiayi City' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新竹縣', 'en-US': 'Hsinchu County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '苗栗縣', 'en-US': 'Miaoli County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '彰化縣', 'en-US': 'Changhua County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '南投縣', 'en-US': 'Nantou County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '雲林縣', 'en-US': 'Yunlin County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '嘉義縣', 'en-US': 'Chiayi County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '屏東縣', 'en-US': 'Pingtung County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '宜蘭縣', 'en-US': 'Yilan County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '花蓮縣', 'en-US': 'Hualien County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '桃園縣', 'en-US': 'Taitung County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '澎湖縣', 'en-US': 'Penghu County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '金門縣', 'en-US': 'Kinmen County' },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '連江縣', 'en-US': 'Lienchiang County' },
    }),
  ];
  Promise.all(
    data.map(item =>
      limit(() =>
        item.save().then(document => {
          console.log(
            `Inserted: ${document.constructor.modelName}(${document._id})`,
          );
          return document;
        }),
      ),
    ),
  ).then(() => {
    process.exit(0);
  });
} else {
  op.showHelp();
}
