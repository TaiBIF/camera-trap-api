module.exports = {
  extends: ['@tbif/base'],
  env: {
    mocha: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js'],
      },
    },
  },
  rules: {
    'object-curly-spacing': 0,
    'func-names': 0,
    'no-param-reassign': 0,
  },
};
