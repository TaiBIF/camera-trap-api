module.exports = {
  parser: 'babel-eslint',
  extends: ['@tbif/base', 'loopback'],
  plugins: ['prettier'],
  rules: {
    'object-curly-spacing': 0,
    'no-console': 0,
    'global-require': 0,
    'no-unused-expressions': [2, { allowTaggedTemplates: true }],
    'consistent-return': 0,
    'no-underscore-dangle': 0,
    'no-debugger': 0,
    'no-param-reassign': [2, { props: false }],
    'no-unused-vars': [
      2,
      { vars: 'all', args: 'none', ignoreRestSiblings: true },
    ],

    'prettier/prettier': 2,

    'react/jsx-curly-brace-presence': [
      2,
      { props: 'always', children: 'never' },
    ],
    'react/no-unescaped-entities': 0,
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/prefer-stateless-function': 0,
    'react/prop-types': [
      2,
      {
        ignore: ['children', 'style', 'location', 'className'],
      },
    ],

    'import/no-extraneous-dependencies': [2, { devDependencies: true }],
  },
};
