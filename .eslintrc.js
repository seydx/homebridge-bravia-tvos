module.exports = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    requireConfigFile: false,
  },
  ignorePatterns: ['homebridge-ui', 'node_modules', 'demo'],
  plugins: ['@babel', 'prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  rules: {
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'only-multiline'],
    'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
    'eol-last': ['error', 'always'],
    'space-before-function-paren': ['error', { named: 'never' }],
    'prettier/prettier': [
      'warn',
      {
        singleQuote: true,
        arrowParens: 'always',
        printWidth: 120,
      },
    ],
  },
};
