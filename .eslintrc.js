module.exports = {
  extends: ['@tbif/base'],
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
