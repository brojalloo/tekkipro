module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@tekkipro/shared/(.*)$': '<rootDir>/../packages/shared/src/$1.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-.*|react-native-safe-area-context))',
  ],
};