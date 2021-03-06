module.exports = {
  studyArea: 'study-area', // 樣區
  cameraLocation: 'camera-location', // 相機位置
  fileName: 'file-name', // 檔名
  time: 'time', // 時間
  species: 'species', // 物種，物種欄位時選項從 ProjectSpeciesModel 尋找
  all() {
    return [
      this.studyArea,
      this.cameraLocation,
      this.fileName,
      this.time,
      this.species,
    ];
  },
};
