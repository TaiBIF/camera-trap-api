module.exports = {
  site: 'site', // 樣區
  camera: 'camera', // 相機位置
  fileName: 'file-name', // 檔名
  time: 'time', // 時間
  species: 'species', // 物種，物種欄位時選項從 ProjectSpeciesModel 尋找
  all() {
    return [this.site, this.camera, this.fileName, this.time, this.species];
  },
};