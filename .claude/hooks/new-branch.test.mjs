// Tests for new-branch.sh: node --test .claude/hooks/new-branch.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./new-branch.sh', import.meta.url));

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
  return spawnSync('bash', [hook], {
    input: JSON.stringify({ session_id, tool_name, tool_input, cwd: repo }), encoding: 'utf8', timeout: 30000,
  });
}
const push = (command, opts) => run({ command }, opts).status;

test('passes commands that are not pushes', () => {
  assert.equal(push('git status'), 0);
  assert.equal(push('echo push'), 0);
  assert.equal(push('git push --delete origin master'), 0);
  assert.equal(push('git push origin :master'), 0);
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
  assert.match(r.stderr, /creates branch feature\./);
  assert.equal(push('git push -u origin feature', { session_id }), 0);
  assert.equal(push('git push origin feature', { session_id }), 0);
  assert.equal(push('git push -u origin feature'), 2);
});

test('resolves HEAD, refspecs and compound commands', () => {
  git('switch', '-q', 'feature');
  assert.equal(push('git push origin HEAD'), 2);
  assert.equal(push(`cd ${repo} && git push -u origin HEAD 2>&1 | tail -2`), 2);
  assert.equal(push(`git -C ${repo} push origin preview:other`), 2);
  assert.equal(push('git push'), 2);
  assert.equal(push('git push -u origin'), 2);
  assert.equal(push("git push origin 'HEAD:x' 2>/dev/null"), 2);
  git('switch', '-q', 'master');
  assert.equal(push('git checkout -b fresh && git push -u origin HEAD'), 2);
  assert.equal(push('git switch -c internal/y && git push -u origin HEAD'), 0);
  assert.equal(push('GIT_TRACE=0 git push origin HEAD:fresh2'), 2);
  assert.equal(push('env git push origin HEAD:fresh3'), 2);
  assert.equal(push('git push'), 0);
});

test('does not push or set upstream', () => {
  push('git push -u origin feature');
  assert.equal(git('ls-remote', '--heads', 'origin', 'feature'), '');
  assert.equal(spawnSync('git', ['rev-parse', '--abbrev-ref', 'feature@{u}'], { cwd: repo }).status, 128);
});

test('checks every push and the MCP create_branch tool', () => {
  assert.equal(push('git push origin master && git push origin feature'), 2);
  const t = { tool_name: 'mcp__github__create_branch' };
  assert.equal(run({ branch: 'internal/x' }, t).status, 0);
  assert.equal(run({ branch: 'other' }, t).status, 2);
});

test('never runs anything from the command', () => {
  const head = git('rev-parse', 'HEAD');
  assert.equal(push('git commit --allow-empty -m "fix push logic"'), 0);
  assert.equal(git('rev-parse', 'HEAD'), head);
  push(`git push origin "$(touch ${join(root, 'pwned')})master"`);
  assert.equal(spawnSync('test', ['-e', join(root, 'pwned')]).status, 1);
  const marker = join(root, 'ran'), script = join(root, 'rp.sh');
  writeFileSync(script, `#!/bin/sh\ntouch ${marker}\nexec git-receive-pack "$@"\n`, { mode: 0o755 });
  writeFileSync(join(repo, '.git/hooks/pre-push'), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
  push(`git push --receive-pack=${script} origin HEAD:rp1`);
  push('git push origin HEAD:rp2');
  push(`git push --rece=${script} origin HEAD:rp3`);
  push(`git push --ex=${script} origin HEAD:rp4`);
  push(`git -c core.sshCommand=${script} -c core.fsmonitor=${script} push origin HEAD:rp5`);
  push(`git -C "$(touch ${marker})" push origin HEAD`);
  push(`git push origin \`touch ${marker}\`rp6`);
  unlinkSync(join(repo, '.git/hooks/pre-push'));
  assert.equal(spawnSync('test', ['-e', marker]).status, 1);
  assert.equal(git('ls-remote', '--heads', 'origin').trim().split('\n').length, 1);
});
