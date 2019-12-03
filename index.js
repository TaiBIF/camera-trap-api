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
  .describe('i', 'Insert database default data.')
  .options('m', {
    alias: 'createMediaConvertJobTemplate',
  })
  .describe('m', 'Create the media convert job template "".')
  .options('u', {
    alias: 'updateProjectAnnotationTime',
  })
  .describe(
    'u',
    `Update 'latestAnnotationTime' and 'oldestAnnotationTime' of all projects.`,
  );

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
  const SpeciesModel = require('./src/models/data/species-model');
  const SpeciesCode = require('./src/models/const/species-code');
  const CameraModel = require('./src/models/data/camera-model');
  const CameraState = require('./src/models/const/camera-state');
  const CameraManufacturer = require('./src/models/data/camera-manufacturer-model');
  const CameraModelModel = require('./src/models/data/camera-model-model');
  const CameraSNModel = require('./src/models/data/camera-serial-number-model');
  const CameraVNModel = require('./src/models/data/camera-vendor-maintenance-number-model');
  const AreaType = require('./src/models/const/area-type');

  const data = [
    new DataFieldModel({
      // 欄位：樣區
      systemCode: DataFieldSystemCode.studyArea,
      title: {
        'zh-TW': '樣區',
        'en-US': 'Study area',
      },
      description: {
        'zh-TW': '樣區,子樣區（若無子樣區，匯入時請留空欄）',
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
        'zh-TW': 'YYYY-MM-DD hh:mm:ss',
        'en-US': 'YYYY-MM-DD hh:mm:ss',
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
      title: {
        'zh-TW': '性別',
        'en-US': 'Sex',
      },
      description: {
        'zh-TW': '雄性、雌性',
        'en-US': 'Male, female',
      },
      options: [
        {
          'zh-TW': '雄性',
          'en-US': 'Male',
        },
        {
          'zh-TW': '雌性',
          'en-US': 'Female',
        },
        {
          'zh-TW': '無法判定',
          'en-US': 'Unidentified',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：年齡
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
        },
        {
          'zh-TW': '亞成體',
          'en-US': 'Subadult',
        },
        {
          'zh-TW': '幼體',
          'en-US': 'Juvenile',
        },
        {
          'zh-TW': '無法判定',
          'en-US': 'Unidentified',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：角況
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
        },
        {
          'zh-TW': '茸角一尖',
          'en-US': '1-point antler in velvet',
        },
        {
          'zh-TW': '茸角一岔二尖',
          'en-US': '2-point antler in velvet',
        },
        {
          'zh-TW': '茸角二岔三尖',
          'en-US': '3-point antler in velvet',
        },
        {
          'zh-TW': '茸角三岔四尖',
          'en-US': '4-point antler in velvet',
        },
        {
          'zh-TW': '硬角一尖',
          'en-US': '1-point antler',
        },
        {
          'zh-TW': '硬角一岔二尖',
          'en-US': '2-point antler',
        },
        {
          'zh-TW': '硬角二岔三尖',
          'en-US': '3-point antler',
        },
        {
          'zh-TW': '硬角三岔四尖',
          'en-US': '3-point antler',
        },
        {
          'zh-TW': '解角',
          'en-US': 'antler drop',
        },
      ],
      widgetType: DataFieldWidgetType.select,
      state: DataFieldState.approved,
    }),
    new DataFieldModel({
      // 欄位：備註
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
    new SpeciesModel({
      isDefault: true,
      code: SpeciesCode.emptyShot,
      title: {
        'zh-TW': '空拍',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      code: SpeciesCode.testShot,
      title: {
        'zh-TW': '測試',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      code: SpeciesCode.human,
      title: {
        'zh-TW': '人',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '定時測試',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '工作照',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '山羌',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '水鹿',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '獼猴',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '鼬獾',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '山羊',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '野豬',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '鼠類',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '白鼻心',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '藍腹鷴',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '食蟹獴',
      },
    }),
    new SpeciesModel({
      isDefault: true,
      title: {
        'zh-TW': '狗',
      },
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台北市', 'en-US': 'Taipei City' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新北市', 'en-US': 'New Taipei City' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '桃園市', 'en-US': 'Taoyuan City' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台中市', 'en-US': 'Taichung City' },
      type: AreaType.west,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '台南市', 'en-US': 'Tainan City' },
      type: AreaType.south,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '高雄市', 'en-US': 'Kaohsiung City' },
      type: AreaType.south,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '基隆市', 'en-US': 'Keelung City' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新竹市', 'en-US': 'Hsinchu City' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '嘉義市', 'en-US': 'Chiayi City' },
      type: AreaType.west,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '新竹縣', 'en-US': 'Hsinchu County' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '苗栗縣', 'en-US': 'Miaoli County' },
      type: AreaType.west,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '彰化縣', 'en-US': 'Changhua County' },
      type: AreaType.west,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '南投縣', 'en-US': 'Nantou County' },
      type: AreaType.west,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '雲林縣', 'en-US': 'Yunlin County' },
      type: AreaType.south,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '嘉義縣', 'en-US': 'Chiayi County' },
      type: AreaType.south,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '屏東縣', 'en-US': 'Pingtung County' },
      type: AreaType.south,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '宜蘭縣', 'en-US': 'Yilan County' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '花蓮縣', 'en-US': 'Hualien County' },
      type: AreaType.east,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '桃園縣', 'en-US': 'Taitung County' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '澎湖縣', 'en-US': 'Penghu County' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '金門縣', 'en-US': 'Kinmen County' },
      type: AreaType.north,
    }),
    new ProjectAreaModel({
      title: { 'zh-TW': '連江縣', 'en-US': 'Lienchiang County' },
      type: AreaType.north,
    }),
    new CameraModel({
      name: '草坔C01',
      sn: 'MX3862A',
      vn: 'BRN00012',
      manufacturer: 'Browning',
      model: 'BR5PXD',
      state: CameraState.active,
    }),
    new CameraModel({
      name: '草坔C02',
      sn: 'MX2862A',
      vn: 'BRN00012',
      manufacturer: 'Browning',
      model: 'BR5PXD',
      state: CameraState.active,
    }),
    new CameraModel({
      name: '草坔C03',
      sn: 'MX3863A',
      vn: 'BRN00112',
      manufacturer: 'Browning',
      model: 'BR5PXD',
      state: CameraState.active,
    }),
    new CameraModel({
      name: '草坔C04',
      sn: 'MX3812A',
      vn: 'BRN01012',
      manufacturer: 'Browning',
      model: 'BR5PXD',
      state: CameraState.active,
    }),
    new CameraManufacturer({
      name: 'Browning',
      dataCount: 4,
    }),
    new CameraModelModel({
      name: 'BR5PXD',
      dataCount: 4,
    }),
    new CameraSNModel({
      name: 'MX3812A',
      dataCount: 1,
    }),
    new CameraSNModel({
      name: 'MX3863A',
      dataCount: 1,
    }),
    new CameraSNModel({
      name: 'MX2862A',
      dataCount: 1,
    }),
    new CameraSNModel({
      name: 'MX3862A',
      dataCount: 1,
    }),
    new CameraVNModel({
      name: 'BRN00012',
      dataCount: 2,
    }),
    new CameraVNModel({
      name: 'BRN00112',
      dataCount: 1,
    }),
    new CameraVNModel({
      name: 'BRN01012',
      dataCount: 1,
    }),
  ];
  Promise.all(
    data.map(item =>
      limit(() =>
        item
          .save()
          .then(document => {
            console.log(
              `Inserted: ${document.constructor.modelName}(${document._id})`,
            );
            return document;
          })
          .catch(e => {
            throw e;
          }),
      ),
    ),
  ).then(() => {
    process.exit(0);
  });
} else if (op.argv.createMediaConvertJobTemplate) {
  const aws = require('aws-sdk');
  const config = require('config');

  const mediaConvert = new aws.MediaConvert({
    accessKeyId: config.mediaConvert.key,
    secretAccessKey: config.mediaConvert.secret,
    region: config.mediaConvert.region,
    endpoint: config.mediaConvert.endpoint,
    apiVersion: '2017-08-29',
  });

  // Create a job template.
  const templateParams = {
    Name: config.mediaConvert.jobTemplate,
    Description: 'Convert videos to mp4 (H.264, 30fps, HD).',
    Queue: config.mediaConvert.queue,
    Settings: {
      OutputGroups: [
        {
          Name: 'File Group',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${config.s3.bucket}/${
                config.s3.folders.annotationVideos
              }/`,
            },
          },
          Outputs: [
            {
              VideoDescription: {
                ScalingBehavior: 'DEFAULT',
                Height: 720,
                TimecodeInsertion: 'DISABLED',
                AntiAlias: 'ENABLED',
                Sharpness: 50,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    InterlaceMode: 'PROGRESSIVE',
                    NumberReferenceFrames: 3,
                    Syntax: 'DEFAULT',
                    Softness: 0,
                    GopClosedCadence: 1,
                    GopSize: 90,
                    Slices: 1,
                    GopBReference: 'DISABLED',
                    SlowPal: 'DISABLED',
                    SpatialAdaptiveQuantization: 'ENABLED',
                    TemporalAdaptiveQuantization: 'ENABLED',
                    FlickerAdaptiveQuantization: 'DISABLED',
                    EntropyEncoding: 'CABAC',
                    Bitrate: 5000000,
                    FramerateControl: 'SPECIFIED',
                    RateControlMode: 'CBR',
                    CodecProfile: 'MAIN',
                    Telecine: 'NONE',
                    MinIInterval: 0,
                    AdaptiveQuantization: 'HIGH',
                    CodecLevel: 'AUTO',
                    FieldEncoding: 'PAFF',
                    SceneChangeDetect: 'ENABLED',
                    QualityTuningLevel: 'SINGLE_PASS',
                    FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    UnregisteredSeiTimecode: 'DISABLED',
                    GopSizeUnits: 'FRAMES',
                    ParControl: 'SPECIFIED',
                    NumberBFramesBetweenReferenceFrames: 2,
                    RepeatPps: 'DISABLED',
                    FramerateNumerator: 30,
                    FramerateDenominator: 1,
                    ParNumerator: 1,
                    ParDenominator: 1,
                  },
                },
                AfdSignaling: 'NONE',
                DropFrameTimecode: 'ENABLED',
                RespondToAfd: 'NONE',
                ColorMetadata: 'INSERT',
              },
              AudioDescriptions: [
                {
                  AudioTypeControl: 'FOLLOW_INPUT',
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      AudioDescriptionBroadcasterMix: 'NORMAL',
                      RateControlMode: 'CBR',
                      CodecProfile: 'LC',
                      CodingMode: 'CODING_MODE_2_0',
                      RawFormat: 'NONE',
                      SampleRate: 48000,
                      Specification: 'MPEG4',
                      Bitrate: 64000,
                    },
                  },
                  LanguageCodeControl: 'FOLLOW_INPUT',
                  AudioSourceName: 'Audio Selector 1',
                },
              ],
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {
                  CslgAtom: 'INCLUDE',
                  FreeSpaceBox: 'EXCLUDE',
                  MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                },
              },
            },
          ],
        },
      ],
      AdAvailOffset: 0,
      Inputs: [
        {
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1,
            },
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW',
          },
          FilterEnable: 'AUTO',
          PsiControl: 'USE_PSI',
          FilterStrength: 0,
          DeblockFilter: 'DISABLED',
          DenoiseFilter: 'DISABLED',
          TimecodeSource: 'EMBEDDED',
        },
      ],
      TimecodeConfig: {
        Source: 'EMBEDDED',
      },
    },
  };
  mediaConvert
    .createJobTemplate(templateParams)
    .promise()
    .then(result => console.log(result))
    .catch(error => console.error(error));
} else if (op.argv.updateProjectAnnotationTime) {
  const utils = require('./src/common/utils');
  const TaskWorker = require('./src/models/const/task-worker');

  const queue = utils.getTaskQueue();
  queue.on('job complete', (id, result) => {
    console.log(`Job ${id} was done.`);
    process.exit(0);
  });
  const job = queue.createJob(TaskWorker.updateProjectAnnotationTime);
  job.save(error => {
    if (error) {
      console.error(error);
    }
  });
} else {
  op.showHelp();
}
