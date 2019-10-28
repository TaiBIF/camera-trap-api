module.exports = {
  north: 'north', // 北部
  south: 'south', // 南部
  east: 'east', // 東部
  west: 'west', // 西部
  all() {
    return [this.north, this.south, this.east, this.west];
  },
};
