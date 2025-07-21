module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
    browser: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Error handling
    'no-console': 'off', // Allow console statements for CLI application
    'no-debugger': 'error',

    // Code quality
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-redeclare': 'error',

    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Styling
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',

    // Node.js specific
    'no-process-exit': 'off', // Allow process.exit for CLI applications
    'no-path-concat': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'logs/',
    'data/',
    '*.min.js'
  ]
};
