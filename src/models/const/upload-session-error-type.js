module.exports = {
  lostExifTime: 'lost-exif-time', // 無法從 exif 中取得時間資訊
  inconsistentQuantity: 'inconsistent-quantity', // 圖片數量與 csv 的資料數量不一致
  imagesAndCsvNotMatch: 'images-and-csv-not-match', // 圖片與 csv 的資料不一致
  permissionDenied: 'permission-denied', // 沒有權限
  missingFieldsStudyArea: 'missing-fields-study-area', // 沒有子樣區
  missingFieldsCameraLocation: 'missing-fields-camera-location', // 相機位置(多筆)
  others: 'others', // 其他錯誤
  all() {
    return [
      this.lostExifTime,
      this.inconsistentQuantity,
      this.imagesAndCsvNotMatch,
      this.permissionDenied,
      this.missingFieldsStudyArea,
      this.missingFieldsCameraLocation,
      this.others,
    ];
  },
};
