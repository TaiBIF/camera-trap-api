module.exports = {
  studyArea: 'study-area', // 樣區
  cameraLocation: 'camera-location', // 相機位置
  fileName: 'file-name', // 檔名
  time: 'time', // 時間
  species: 'species', // 物種，物種欄位時選項從 SpeciesModel 尋找
  gender: 'gender', // 性別
  lifeStage: 'life-stage', // 年齡
  antler: 'antler', // 角況
  remarks: 'remarks', // 備註
  all() {
    return [
      this.studyArea,
      this.cameraLocation,
      this.fileName,
      this.time,
      this.species,
      this.gender,
      this.lifeStage,
      this.antler,
      this.remarks,
    ];
  },
};
