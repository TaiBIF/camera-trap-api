module.exports = {
  lostExifTime: 'lost-exif-time', // 無法從 exif 中取得時間資訊
  permissionDenied: 'permission-denied', // 沒有權限
  others: 'others', // 其他錯誤
  all() {
    return [this.lostExifTime, this.permissionDenied, this.others];
  },
};
