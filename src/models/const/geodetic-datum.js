module.exports = {
  wgs84: 'WGS84',
  twd97: 'TWD97',
  all() {
    return [this.wgs84, this.twd97];
  },
};
