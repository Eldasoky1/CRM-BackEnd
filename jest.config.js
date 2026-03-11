/**
 * Jest Configuration for TypeScript
 */

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.js'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/index.ts',
        '!src/types/**/*.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    setupFilesAfterEnv: ['./tests/setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
