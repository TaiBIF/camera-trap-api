module.exports = {
  site: 'site', // 樣區
  cameraLocation: 'camera-location', // 相機位置
  fileName: 'file-name', // 檔名
  time: 'time', // 時間
  species: 'species', // 物種，物種欄位時選項從 SpeciesModel 尋找
  all() {
    return [
      this.site,
      this.cameraLocation,
      this.fileName,
      this.time,
      this.species,
    ];
  },
};
