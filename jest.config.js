// Two projects.
//
// The single node-flavoured project this replaced could not render, or even
// import, a React Native component — it had no preset, and it force-mapped
// `expo` to a stub. So every screen and component in the app was structurally
// untestable, including the pieces CLAUDE.md itself flags as having shipped
// real bugs: the reader's history-page index math, the Theory screen's
// prefetch guard, the Under-Map's per-descent state.
//
// `logic` keeps that fast node environment for the pure model, services,
// storage and hooks. `ui` uses jest-expo (already a devDependency) so the
// components and screens can actually be mounted.

const transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core)',
];

module.exports = {
  projects: [
    {
      displayName: 'logic',
      transform: { '\\.[jt]sx?$': 'babel-jest' },
      transformIgnorePatterns,
      setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
      // Keeps the expo runtime out of the pure tests.
      moduleNameMapper: { '^expo$': '<rootDir>/__mocks__/expo.js' },
      testMatch: [
        '<rootDir>/src/data/**/__tests__/**/*.test.js',
        '<rootDir>/src/services/**/__tests__/**/*.test.js',
        '<rootDir>/src/storage/**/__tests__/**/*.test.js',
        '<rootDir>/src/utils/**/__tests__/**/*.test.js',
      ],
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      transformIgnorePatterns,
      setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
      // No expo stub here: the preset supplies its own mocks, and shadowing
      // them is what made rendering impossible.
      testMatch: [
        '<rootDir>/src/components/**/__tests__/**/*.test.js',
        '<rootDir>/src/screens/**/__tests__/**/*.test.js',
        '<rootDir>/src/hooks/**/__tests__/**/*.test.js',
        '<rootDir>/src/context/**/__tests__/**/*.test.js',
      ],
    },
  ],
};
