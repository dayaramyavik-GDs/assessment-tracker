const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['platforms/', 'plugins/', 'node_modules/', 'www/lib/', 'www/js/grades.js'] },
  js.configs.recommended,
  {
    files: ['www/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, $: 'readonly', cordova: 'readonly', AT_CONFIG: 'readonly', Grades: 'readonly' },
    },
  },
  { files: ['scripts/**/*.js', 'eslint.config.js'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
];