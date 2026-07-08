class Asset {
  static fromModule() {
    return new Asset();
  }
  static loadAsync() {
    return Promise.resolve([]);
  }
  uri = 'file://mock-asset';
  localUri = 'file://mock-asset';
  hash = null;
  name = 'mock';
  type = '';
  downloadAsync() {
    return Promise.resolve(this);
  }
}

module.exports = { Asset };
