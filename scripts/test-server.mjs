import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'supper_club-e2e-'));
const env = {
  ...process.env,
  DATABASE_URL: `file:${path.join(directory, 'test.db')}`,
  UPLOAD_DIR: path.join(directory, 'uploads'),
  SESSION_SECRET: 'browser-test-secret-at-least-thirty-two-characters',
  COOKIE_SECURE: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
};
try {
  for (const args of [
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'],
  ]) {
    const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Could not prepare isolated browser fixtures');
  }
} catch (error) {
  fs.rmSync(directory, { recursive: true, force: true });
  throw error;
}
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3000'], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => {
  fs.rmSync(directory, { recursive: true, force: true });
  process.exit(code ?? 1);
});
