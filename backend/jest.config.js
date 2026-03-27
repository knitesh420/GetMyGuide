module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src', '<rootDir>/tests'],
	testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: {
					module: 'commonjs',
				},
			},
		],
	},
	moduleNameMapper: {
		'^@services/(.*)$': '<rootDir>/src/services/$1',
		'^@config/(.*)$': '<rootDir>/src/config/$1',
		'^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
		'^@modules/(.*)$': '<rootDir>/src/modules/$1',
		'^@provider/(.*)$': '<rootDir>/src/provider/$1',
		'^@utils/(.*)$': '<rootDir>/src/utils/$1',
		'^@types/(.*)$': '<rootDir>/src/types/$1',
		'^@mongo$': '<rootDir>/src/mongo/index',
		'^@mongo/(.*)$': '<rootDir>/src/mongo/$1',
	},
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/provider/**',
		'!src/server.ts',
		'!src/server-config.ts',
		'!src/types/**',
		'!src/mongo/types/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
	testTimeout: 30000,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
};
