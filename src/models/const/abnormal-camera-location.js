module.exports = {
  // 1. 相機故障 (空拍過多); 2. 相機故障 (沒影像); 3. 相繼失竊 4. 相機電量好所過快 5. 其他
  emptyShots: 'empty-shots', // 相機故障 (空拍過多)
  noPhoto: 'no-photo', // 相機故障 (沒影像)
  cameraTheft: 'camera-theft', // 相繼失竊
  noBattery: 'noBattery', // 相機電量耗損過快
  others: 'others',
  all() {
    return [
      this.emptyShots,
      this.noPhoto,
      this.cameraTheft,
      this.noBattery,
      this.others,
    ];
  },
};
