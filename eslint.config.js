// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'android/**',
      'ios/**',
      '.expo/**',
    ],
  },

  // Source files — strict rules
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx', 'index.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Unused variables and imports — catch dead code
      '@typescript-eslint/no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],

      // No explicit any — keep the type system honest
      '@typescript-eslint/no-explicit-any': 'warn',

      // No console.log left in production source
      'no-console': 'error',

      // React hooks correctness
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Prefer const
      'prefer-const': 'error',
    },
  },

  // Test files — relaxed rules (any is often needed in mocks)
  {
    files: ['src/__tests__/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },
];
