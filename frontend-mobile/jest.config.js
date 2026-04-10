/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/lib'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      globals: {
        __DEV__: true,
      },
    },
    {
      displayName: 'components',
      preset: 'jest-expo',
      roots: ['<rootDir>/components'],
      testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|nativewind|react-native-reanimated|@tanstack|@testing-library))',
      ],
      moduleNameMapper: {
        '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
      },
      globals: {
        __DEV__: true,
      },
      setupFiles: ['<rootDir>/jest.setup.early.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/__tests__'],
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      testPathIgnorePatterns: [
        // TODO(jsdom-incompat): re-enable when Daily.co hooks have a jest-expo-friendly mock
        'useDailyCall\\.test\\.ts$',
        // TODO(jsdom-incompat): re-enable when Daily transcription mock works under jsdom
        'useDailyTranscription\\.test\\.ts$',
        // TODO(jsdom-incompat): re-enable when video call events mock works under jsdom
        'useVideoCallEvents\\.test\\.ts$',
        // TODO(contract-drift): re-enable when API contract fixtures are regenerated against the live OpenAPI
        'api-contracts\\.test\\.ts$',
        // TODO(low-coverage): re-enable when low-coverage suites are split from integration project
        'api-lowcoverage\\.test\\.ts$',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      globals: {
        __DEV__: true,
      },
      setupFiles: ['<rootDir>/jest.setup.early.js'],
    },
    {
      displayName: 'integration-hooks',
      preset: 'jest-expo',
      roots: ['<rootDir>/__tests__'],
      testMatch: [
        '**/useDailyCall.test.ts',
        '**/useDailyTranscription.test.ts',
        '**/useVideoCallEvents.test.ts',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|nativewind|react-native-reanimated|@tanstack|@testing-library))',
      ],
      moduleNameMapper: {
        '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
      },
      globals: { __DEV__: true },
      setupFiles: ['<rootDir>/jest.setup.early.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '__tests__/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 15,
      functions: 15,
      lines: 26,
    },
  },
};
