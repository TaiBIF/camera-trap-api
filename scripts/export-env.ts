import env from '../common/.env';

const exportEnv = Object.entries(env).reduce(
  (s, [env, value]) => `${s}export ${env}=${value}\n`,
  '',
);

console.log(exportEnv)
