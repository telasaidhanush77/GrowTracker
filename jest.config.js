module.exports = {
  preset: 'jest-expo',
  // ponytail: heavy screen tests exceed the 5s default when every core runs a worker
  testTimeout: 30000,
  maxWorkers: '50%',
setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo[-\w]*|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|@react-native/.*)',
  ],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^expo-asset$': '<rootDir>/__mocks__/expo-asset.js',
    '^@expo/vector-icons(/.+)?$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^react-native-get-random-values$': '<rootDir>/__mocks__/react-native-get-random-values.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/db/types.ts',
  ],
};
