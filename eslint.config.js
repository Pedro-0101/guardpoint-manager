// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: ['gp', 'z'],
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['gp', 'z'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['src/app/shared/components/table/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
    },
  },
  {
    files: [
      'src/app/shared/components/toast/**/*.ts',
      'src/app/shared/components/alert/**/*.ts',
      'src/app/shared/components/button/**/*.ts',
      'src/app/shared/components/radio/**/*.ts',
    ],
    rules: {
      '@angular-eslint/component-selector': 'off',
    },
  },
  {
    files: [
      'src/app/shared/components/tooltip/**/*.ts',
      'src/app/shared/core/directives/string-template-outlet/**/*.ts',
    ],
    rules: {
      '@angular-eslint/directive-selector': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
