import env from '../common/.env';
import { unlinkSync, createWriteStream } from 'fs'
const exportEnv = Object.entries(env).reduce(
  (s, [env, value]) => `${s}export ${env}=${value}\n`,
  '',
);

try {
  unlinkSync('.env');
} catch(_er) {

} finally {
  createWriteStream('.env').write(`#!/usr/bin/env bash\n${exportEnv}`);
}
