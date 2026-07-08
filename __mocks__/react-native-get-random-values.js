// The real module polyfills global.crypto.getRandomValues for React Native.
// In the Jest (node/jsdom) environment we back it with Node's webcrypto so
// LargeSecureStore's AES key generation works under test.
const nodeCrypto = require('crypto');

if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = (arr) => nodeCrypto.randomFillSync(arr);
}

module.exports = {};
