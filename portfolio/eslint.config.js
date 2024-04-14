const { FlatCompat } = require('@eslint/eslintrc');
const baseConfig = require('../eslint.config.js');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...baseConfig,
  ...compat.extends(
    'plugin:@nx/react-typescript',
    'next',
    'next/core-web-vitals',
  ),
  {
    files: ['**/*.*'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@next/next/no-html-link-for-pages': ['error', 'portfolio/pages'],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {},
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {},
  },
  { ignores: ['.next/**/*'] },
];
