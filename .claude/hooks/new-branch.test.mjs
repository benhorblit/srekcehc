// Tests for new-branch.mjs: node --test .claude/hooks/new-branch.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./new-branch.mjs', import.meta.url));

// A clone of a local bare origin with one pushed branch, `master`.
const root = mkdtempSync(join(tmpdir(), 'new-branch-test-'));
const origin = join(root, 'origin.git');
const repo = join(root, 'repo');
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
execFileSync('git', ['clone', '-q', origin, repo], { stdio: 'ignore' });
git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x');
git('push', '-q', 'origin', 'master');
for (const b of ['feature', 'preview', 'internal/thing']) git('branch', b);

function run(tool_input, { tool_name = 'Bash', session_id = randomUUID() } = {}) {
  return spawnSync('node', [hook], {
    input: JSON.stringify({ session_id, tool_name, tool_input, cwd: repo }), encoding: 'utf8', timeout: 30000,
  });
}
const push = (command, opts) => run({ command }, opts).status;

test('passes commands that are not pushes', () => {
  assert.equal(push('git status'), 0);
  assert.equal(push('echo push'), 0);
});

test('passes allowed new branches and existing ones', () => {
  assert.equal(push('git push -u origin preview'), 0);
  assert.equal(push('git push -u origin internal/thing'), 0);
  assert.equal(push('git push origin master'), 0);
  assert.equal(push('git push origin feature:internal/other'), 0);
});

test('blocks other new branches, then passes every rerun', () => {
  const session_id = randomUUID();
  const r = run({ command: 'git push -u origin feature' }, { session_id });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /creates feature /);
  assert.equal(push('git push -u origin feature', { session_id }), 0);
  assert.equal(push('git push -u origin feature', { session_id }), 0);
  assert.equal(push('git push -u origin feature'), 2);
});

test('resolves HEAD, refspecs and compound commands', () => {
  git('switch', '-q', 'feature');
  assert.equal(push('git push origin HEAD'), 2);
  assert.equal(push(`cd ${repo} && git push -u origin HEAD 2>&1 | tail -2`), 2);
  assert.equal(push(`git -C ${repo} push origin preview:other`), 2);
  git('switch', '-q', 'master');
});

test('dry run does not push or set upstream', () => {
  push('git push -u origin feature');
  assert.equal(git('ls-remote', '--heads', 'origin', 'feature'), '');
  assert.equal(spawnSync('git', ['rev-parse', '--abbrev-ref', 'feature@{u}'], { cwd: repo }).status, 128);
});
