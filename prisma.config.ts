import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// prisma.config.ts suppresses automatic .env loading — load it manually.
const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key !== undefined && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
