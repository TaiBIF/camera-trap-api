module.exports = class PageList {
  constructor(index, size, total, items) {
    /*
    @param index {Number} The page index.
    @param size {Number} The page size.
    @param total {Number}
    @param items {Array<Object>}
     */
    this.index = index;
    this.size = size;
    this.total = total;
    this.items = items.map(item =>
      typeof item.dump === 'function' ? item.dump() : item,
    );
  }
};
