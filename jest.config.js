module.exports = {
  // Use babel-jest to transform files using the project's babel config
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  // Keep the ignore patterns to handle expo modules correctly
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  // Explicitly map expo to a mock to prevent it from loading the runtime
  moduleNameMapper: {
    '^expo$': '<rootDir>/__mocks__/expo.js',
  },
};
