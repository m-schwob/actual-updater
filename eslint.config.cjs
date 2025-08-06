// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/service/*.ts', 'src/utils/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                project: './tsconfig.json'
            }
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'off'
        }
    },
    {
        ignores: [
            'dist/',
            'node_modules/',
            'coverage/',
            '**/*.js',
            '**/*.cjs',
            '.venv/',
            '.yarn/',
            'data/',
            '**/*.d.ts',
            'eslint.config.cjs'
        ]
    }
);
