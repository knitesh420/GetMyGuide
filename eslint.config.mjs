import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next 16 removed `next lint`, and this project had no ESLint config at all —
// so ~400 frontend files were being linted by nothing. eslint-config-next v16
// ships native flat config, so it is spread in directly; going through
// FlatCompat (the older eslintrc bridge) fails on this version.
//
// core-web-vitals carries the React-hooks rules, exhaustive-deps in particular,
// which are the ones that actually catch bugs in a codebase this heavy on
// useEffect.
const eslintConfig = [
	...coreWebVitals,
	...nextTypescript,
	{
		ignores: [
			"node_modules/**",
			".next/**",
			"out/**",
			"build/**",
			"next-env.d.ts",
		],
	},
	{
		rules: {
			// Warnings, not errors: the existing code has ~277 `any` occurrences
			// (mostly `catch (err: any)`). Failing the build on all of them today
			// would mean nobody runs lint at all. Visible, not blocking.
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
];

export default eslintConfig;
