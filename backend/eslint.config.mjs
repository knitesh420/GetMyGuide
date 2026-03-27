import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import { config as tseslintConfig, configs as tseslintConfigs } from 'typescript-eslint';

export default tseslintConfig(
    eslint.configs.recommended,
    ...tseslintConfigs.recommended,
    {
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
        },
    },
    prettierConfig,
    {
        ignores: [
            '**/node_modules/**',
            '**/build/**',
            '**/dist/**',
            '**/*.config.js',
            '**/*.config.mjs',
            '**/coverage/**',
            '**/.next/**',
            '**/out/**',
        ],
    }
);

