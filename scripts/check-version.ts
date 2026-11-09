import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseVersion(value: unknown) {
  const match = typeof value === 'string'
    ? /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value)
    : null;
  const prerelease = match?.[4]?.split('.') ?? [];
  if (!match || match[0] !== value || prerelease.some((part) => /^0\d+$/.test(part))) {
    throw new Error(`Invalid SemVer version: ${String(value)}`);
  }
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

export function compareVersions(current: unknown, base: unknown): number {
  const left = parseVersion(current);
  const right = parseVersion(base);
  for (const [index, part] of left.core.entries()) {
    const other = right.core[index]!;
    if (part !== other) return part > other ? 1 : -1;
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    return Number(!left.prerelease.length) - Number(!right.prerelease.length);
  }
  for (let index = 0; index < Math.max(left.prerelease.length, right.prerelease.length); index++) {
    const part = left.prerelease[index];
    const other = right.prerelease[index];
    if (part === undefined) return -1;
    if (other === undefined) return 1;
    if (part === other) continue;
    const numeric = /^\d+$/.test(part);
    const otherNumeric = /^\d+$/.test(other);
    if (numeric && otherNumeric) return BigInt(part) > BigInt(other) ? 1 : -1;
    if (numeric !== otherNumeric) return numeric ? -1 : 1;
    return part > other ? 1 : -1;
  }
  return 0;
}

function checkVersion(baseRef?: string) {
  const current: { version?: unknown } = JSON.parse(readFileSync('package.json', 'utf8'));
  parseVersion(current.version);
  const lock: { version?: unknown; packages?: Record<string, { version?: unknown }> } =
    JSON.parse(readFileSync('package-lock.json', 'utf8'));
  if (lock.version !== current.version || lock.packages?.['']?.version !== current.version) {
    throw new Error('Both root versions in package-lock.json must match package.json.version.');
  }
  if (baseRef) {
    if (baseRef.startsWith('-')) throw new Error('The base ref must be a Git ref or commit.');
    const base: { version?: unknown } = JSON.parse(execFileSync(
      'git', ['show', `${baseRef}:package.json`], { encoding: 'utf8' },
    ));
    if (compareVersions(current.version, base.version) <= 0) {
      throw new Error(`Bump package.json.version above ${String(base.version)} (base ${baseRef}); received ${String(current.version)}.`);
    }
    console.log(`Release version increased: ${String(base.version)} → ${String(current.version)}.`);
  }
  console.log(`Package and lockfile versions match: ${String(current.version)}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkVersion(process.argv[2] || undefined);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
