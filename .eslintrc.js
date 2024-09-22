module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    // project: './tsconfig.json', // Specify it only if you need type-aware linting
    tsconfigRootDir: __dirname,
  },
  settings: {},
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    // Custom rules
    'prettier/prettier': 'error',
    // '@typescript-eslint/naming-convention': [
    //   'error',
    //   {
    //     selector: 'variableLike',
    //     format: ['camelCase'],
    //     leadingUnderscore: 'allow',
    //     trailingUnderscore: 'allow',
    //   },
    //   {
    //     selector: 'typeLike',
    //     format: ['PascalCase'],
    //   },
    // ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
};
