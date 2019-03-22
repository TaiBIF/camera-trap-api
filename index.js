const optimist = require('optimist');
const qLimit = require('qlimit');

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
  const DataFieldModel = require('./src/models/data/data-field-model');
  const UserModel = require('./src/models/data/user-model');
  const limit = qLimit(1);

  Promise.all(
    models.map(
      limit(model => {
        console.log(`Create: ${model.modelName}`);
        return model.createIndexes();
      }),
    ),
  )
    .then(() =>
      DataFieldModel.collection.createIndex(
        { systemCode: 1 },
        {
          name: 'SystemCode',
          background: true,
          unique: true,
          partialFilterExpression: {
            systemCode: { $exists: true },
          },
        },
      ),
    )
    .then(() =>
      UserModel.collection.createIndex(
        { email: 1 },
        {
          name: 'Email',
          background: true,
          unique: true,
          partialFilterExpression: {
            email: { $exists: true },
          },
        },
      ),
    )
    .then(() => {
      process.exit(0);
    });
} else if (op.argv.insertData) {
  // Insert database default data.
  const limit = qLimit(1);
  const DataFieldModel = require('./src/models/data/data-field-model');
  const DataFieldSystemCode = require('./src/models/const/data-field-system-code');
  const DataFieldWidgetType = require('./src/models/const/data-field-widget-type');
  const DataFieldState = require('./src/models/const/data-field-state');

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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
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
      state: DataFieldState.published,
    }),
  ];
  Promise.all(
    data.map(
      limit(item =>
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
