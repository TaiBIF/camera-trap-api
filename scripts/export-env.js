const env = require('camera-trap-credentials/env');

console.log(
  Object.entries(env).reduce(
    (cmd, [ENV, value]) => `${cmd}export ${ENV}='${value}'\n`,
    '',
  ),
);
