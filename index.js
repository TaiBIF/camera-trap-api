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
        'en-US': 'Study area',
      },
      description: {
        'zh-TW': '樣區-子樣區',
        'en-US': 'Study area (self-referencing possible)',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：相機位置
      systemCode: DataFieldSystemCode.cameraLocation,
      title: {
        'zh-TW': '相機位置',
        'en-US': 'Camera Location',
      },
      description: {
        'zh-TW': '相機位置名稱',
        'en-US': 'Camera Location',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：檔名
      systemCode: DataFieldSystemCode.fileName,
      title: {
        'zh-TW': '檔名',
        'en-US': 'File name',
      },
      description: {
        'zh-TW': '檔名，如 01234.jpg',
        'en-US': 'File name, such as 01234.jpg',
      },
      widgetType: DataFieldWidgetType.text,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：日期時間
      systemCode: DataFieldSystemCode.time,
      title: {
        'zh-TW': '日期時間',
        'en-US': 'Date and time',
      },
      description: {
        'zh-TW': 'YY-MM-DD hh:mm',
        'en-US': 'YY-MM-DD hh:mm',
      },
      widgetType: DataFieldWidgetType.time,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      systemCode: DataFieldSystemCode.species,
      title: {
        'zh-TW': '物種',
        'en-US': 'Species',
      },
      description: {
        'zh-TW': '照片辨識結果',
        'en-US': 'Identification',
      },
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：性別
      systemCode: DataFieldSystemCode.gender,
      title: {
        'zh-TW': '性別',
        'en-US': 'Gender',
      },
      description: {
        'zh-TW': '雄性、雌性',
        'en-US': 'Male, female',
      },
      options: [
        {
          'zh-TW': '雄性',
          'en-US': 'Male',
          key: 'male',
        },
        {
          'zh-TW': '雌性',
          'en-US': 'Female',
          key: 'female',
        },
        {
          'zh-TW': '無法判定',
          'en-US': 'Unidentified',
          key: 'unidentified',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：年齡
      systemCode: DataFieldSystemCode.lifeStage,
      title: {
        'zh-TW': '年齡',
        'en-US': 'Life Stage',
      },
      description: {
        'zh-TW': '成體、亞成體、幼體',
        'en-US': 'Adult, Subadult, Juvenile',
      },
      options: [
        {
          'zh-TW': '成體',
          'en-US': 'Adult',
          key: 'adult',
        },
        {
          'zh-TW': '亞成體',
          'en-US': 'Subadult',
          key: 'subadult',
        },
        {
          'zh-TW': '幼體',
          'en-US': 'Juvenile',
          key: 'juvenile',
        },
        {
          'zh-TW': '無法判定',
          'en-US': 'Unidentified',
          key: 'unidentified',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：角況
      systemCode: DataFieldSystemCode.antler,
      title: {
        'zh-TW': '角況',
        'en-US': 'Antler',
      },
      description: {
        'zh-TW': '水鹿角況',
        'en-US': 'Antler',
      },
      options: [
        {
          'zh-TW': '初茸',
          'en-US': 'Initial appearance of antler in velvet',
          key: 'initialAppearanceOfAntlerInVelvet',
        },
        {
          'zh-TW': '茸角一尖',
          'en-US': '1-point antler in velvet',
          key: '1pointAntlerInVelvet',
        },
        {
          'zh-TW': '茸角一岔二尖',
          'en-US': '2-point antler in velvet',
          key: '2pointAntlerInVelvet',
        },
        {
          'zh-TW': '茸角二岔三尖',
          'en-US': '3-point antler in velvet',
          key: '3pointAntlerInVelvet',
        },
        {
          'zh-TW': '茸角三岔四尖',
          'en-US': '4-point antler in velvet',
          key: '4pointAntlerInVelvet',
        },
        {
          'zh-TW': '硬角一尖',
          'en-US': '1-point antler',
          key: '1pointAntler',
        },
        {
          'zh-TW': '硬角一岔二尖',
          'en-US': '2-point antler',
          key: '2pointAntler',
        },
        {
          'zh-TW': '硬角二岔三尖',
          'en-US': '3-point antler',
          key: '3pointAntler',
        },
        {
          'zh-TW': '硬角三岔四尖',
          'en-US': '4-point antler',
          key: '4pointAntler',
        },
        {
          'zh-TW': '解角',
          'en-US': 'antler drop',
          key: 'antlerDrop',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：備註
      systemCode: DataFieldSystemCode.remarks,
      title: {
        'zh-TW': '備註',
        'en-US': 'Remarks',
      },
      description: {
        'zh-TW': '',
        'en-US': '',
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
