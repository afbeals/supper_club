// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compareVersions } from '../check-version';

const script = resolve('scripts/check-version.ts');

describe('SemVer precedence for release versions', () => {
  it.each([
    ['1.0.2', '1.0.1', 1],
    ['1.0.10', '1.0.9', 1],
    ['1.1.0', '1.0.99', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.0.1', '1.0.1', 0],
    ['1.0.0', '1.0.1', -1],
    ['1.0.2-alpha', '1.0.1', 1],
    ['1.0.2', '1.0.2-rc.1', 1],
    ['1.0.2-rc.1', '1.0.2', -1],
    ['1.0.2-alpha.10', '1.0.2-alpha.9', 1],
    ['1.0.2-alpha.1', '1.0.2-alpha', 1],
    ['1.0.2-alpha', '1.0.2-alpha.1', -1],
    ['1.0.2-beta', '1.0.2-alpha', 1],
    ['1.0.2-1', '1.0.2-alpha', -1],
    ['1.0.2-alpha', '1.0.2-1', 1],
    ['1.0.2+build.2', '1.0.2+build.1', 0],
    ['1.0.2-rc.1+build.2', '1.0.2-rc.1', 0],
  ])('%s compared with %s returns %s', (current, base, expected) => {
    expect(compareVersions(current, base)).toBe(expected);
    expect(compareVersions(base, current)).toBe(expected === 0 ? 0 : -expected);
  });

  it.each(['1.0', 'v1.0.2', '01.0.2', '1.00.2', '1.0.02', '1.0.2-01',
    '1.0.2-alpha..1', '1.0.2+', '1.0.2+bad!', '1.0.2\n', '', null, 102])(
    'rejects invalid version %s on either side', (invalid) => {
      expect(() => compareVersions(invalid, '1.0.1')).toThrow('Invalid SemVer');
      expect(() => compareVersions('1.0.2', invalid)).toThrow('Invalid SemVer');
    },
  );
});

describe('version check command in a real temporary Git repository', () => {
  let directory: string;
  function manifests(version: string, lockVersion = version, rootVersion = version) {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ version }));
    writeFileSync(join(directory, 'package-lock.json'), JSON.stringify({
      version: lockVersion, packages: { '': { version: rootVersion } },
    }));
  }
  function run(...args: string[]) {
    return spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: 'utf8' });
  }
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'supper-version-'));
    const hooks = join(directory, 'empty-hooks');
    mkdirSync(hooks);
    execFileSync('git', ['init', '-q', '--initial-branch=main', directory]);
    manifests('1.0.1');
    execFileSync('git', ['add', 'package.json', 'package-lock.json'], { cwd: directory });
    execFileSync('git', ['-c', `core.hooksPath=${hooks}`, '-c', 'commit.gpgsign=false',
      '-c', 'user.name=Version test', '-c', 'user.email=version@example.test',
      'commit', '-qm', 'Base version'], { cwd: directory });
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('accepts a version increase over the supplied Git base', () => {
    manifests('1.0.2');
    const result = run('HEAD');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1.0.1 → 1.0.2');
  });
  it.each(['1.0.1', '1.0.0'])('fails for an unchanged or lower version: %s', (version) => {
    manifests(version);
    const result = run('HEAD');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bump package.json.version above 1.0.1');
  });
  it.each([['1.0.1', '1.0.2'], ['1.0.2', '1.0.1']])(
    'fails for either inconsistent lockfile version (%s, %s)', (lockVersion, rootVersion) => {
      manifests('1.0.2', lockVersion, rootVersion);
      const result = run('HEAD');
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Both root versions in package-lock.json must match');
    },
  );
  it('fails for a missing workspace root in the npm lockfile', () => {
    writeFileSync(join(directory, 'package-lock.json'), JSON.stringify({ version: '1.0.1' }));
    expect(run().status).toBe(1);
  });
  it('fails rather than skipping an unknown base ref', () => {
    manifests('1.0.2');
    expect(run('missing-base-ref').status).toBe(1);
  });
  it('fails for an invalid package version even without a base ref', () => {
    manifests('invalid');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid SemVer');
  });
  it.each([[], ['']])('allows consistency-only runs on main/manual triggers (%j)', (...args) => {
    const result = run(...args);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Package and lockfile versions match: 1.0.1');
    expect(result.stdout).not.toContain('increased');
  });
});
