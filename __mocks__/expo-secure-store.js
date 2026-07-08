// In-memory mock of expo-secure-store for Jest.
// Mirrors the async keychain API used by LargeSecureStore.
const store = new Map();

module.exports = {
  setItemAsync: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
  deleteItemAsync: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  __reset: () => store.clear(),
};
