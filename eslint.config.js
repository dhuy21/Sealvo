const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'package-lock.json', '**/*.min.js', 'public/images/'] },
  // Server-side (Node)
  {
    files: ['**/*.js'],
    ignores: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-useless-assignment': 'warn',
    },
  },
  // Client-side (browser) – globals from script tags / shared libs
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        confetti: 'readonly',
        createParticle: 'readonly',
        createSpeedLine: 'readonly',
        loader: 'readonly',
        oldHtml: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-useless-assignment': 'warn',
    },
  },
  prettier,
];
