/**
 * Jest config for the server-side code (server/ + tests/).
 *
 * Paths moved in the Next.js migration: backend/src -> server/, backend/tests ->
 * tests/. The aliases below are the same set as before, repointed; the root
 * tsconfig.json carries the matching `paths` for the editor and `tsc`.
 *
 * `roots` deliberately excludes app/, components/ and lib/ — those are React and
 * belong to Next's own toolchain, not this Node-environment suite.
 */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/server', '<rootDir>/tests'],
	testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				// Point at the server tsconfig FILE, not an inline object. ts-jest
				// merges inline options into the nearest tsconfig.json, which here is
				// the Next app's — and Next's global types declare process.env.NODE_ENV
				// readonly, which every suite trips over in tests/setup/jest.setup.ts.
				// Naming the file keeps the server's compile context Next-free.
				tsconfig: '<rootDir>/tsconfig.server.json',
			},
		],
	},
	moduleNameMapper: {
		// Next's app alias, so tests can import Route Handlers from app/.
		'^@/(.*)$': '<rootDir>/$1',
		'^@services/(.*)$': '<rootDir>/server/services/$1',
		'^@config/(.*)$': '<rootDir>/server/config/$1',
		'^@middleware/(.*)$': '<rootDir>/server/middleware/$1',
		'^@modules/(.*)$': '<rootDir>/server/modules/$1',
		'^@provider/(.*)$': '<rootDir>/server/provider/$1',
		'^@utils/(.*)$': '<rootDir>/server/utils/$1',
		'^@mongo$': '<rootDir>/server/mongo/index',
		'^@mongo/(.*)$': '<rootDir>/server/mongo/$1',
	},
	collectCoverageFrom: [
		'server/**/*.ts',
		'!server/**/*.d.ts',
		'!server/provider/**',
		'!server/server.ts',
		'!server/server-config.ts',
		'!server/types/**',
		'!server/mongo/types/**',
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
