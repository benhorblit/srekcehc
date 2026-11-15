// Tests for issue-refs.mjs: node --test .claude/hooks/issue-refs.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./issue-refs.mjs', import.meta.url));

function call(payload) {
  return spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8', timeout: 10000 }).status;
}
function run(tool_input, { tool_name = 'mcp__github__add_issue_comment', session_id = randomUUID() } = {}) {
  return call({ session_id, tool_name, tool_input });
}
const body = (b) => run({ body: b });

test('passes real references', () => {
  for (const b of [
    '> - Close #8\n> - Fixes: #12\n> - resolved #3',
    'See issue #5 and PRs #6, #7 or #9.',
    'pull request #4',
    'Also owner/repo#3.',
    'Fixes GH-5',
    'branch fix-gh-12',
    'url#4',
  ]) assert.equal(body(b), 0, b);
});

test('passes title suffixes', () => {
  assert.equal(run({ title: 'Add hook [#8]' }), 0);
  assert.equal(run({ commit_title: 'Add hook [#8] (#9)' }), 0);
  assert.equal(run({ commit_title: 'Add hook (#9)' }), 0);
  assert.equal(run({ message: 'Add hook [#8]\n\nBody' }), 0);
});

test('blocks numbers that would link', () => {
  for (const b of [
    'Step #3 does it',
    'See [here](#3)',
    'Options [a](#3 is best)',
    'R&#5 x',
    'a ##5 b',
    '```\nstep #3\n```',
    'and `#2` inline',
    'Text\n\n    indented code #5',
    'see #5',
    '#1 thing',
    'Fixes #3 then step #4',
    'see docs/README.md #3',
    'and/or #5',
    'GH-5 is done',
    'We need to fix\n\n#1 priority',
    'Closes #8, #9\n\nAnd #10 is the count',
  ]) assert.equal(body(b), 2, b);
  assert.equal(run({ title: '#8 thing' }), 2);
  assert.equal(run({ title: 'Add (#9) hook' }), 2);
  assert.equal(run({ message: 'Title\n\nbody [#8]' }), 2);
  assert.equal(run({ message: 'Title\n\n```\nstep #5\n```' }), 2);
});

test('an identical resend passes once, a changed one does not', () => {
  const s = { session_id: randomUUID() };
  assert.equal(run({ body: 'see #5' }, s), 2);
  assert.equal(run({ body: 'see #5' }, s), 0);
  assert.equal(run({ body: 'see #5' }, s), 2);
  assert.equal(run({ body: 'see #6' }, s), 2);
  assert.equal(run({ body: 'see #6', issue_number: 2 }, s), 2);
  assert.equal(run({ body: 'see #5' }), 2);
});

test('fails closed', () => {
  const r = spawnSync('node', [hook], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('stays fast on long text', () => {
  const t = Date.now();
  body(Array.from({ length: 5000 }, (_, i) => `issue #${i}`).join('\n'));
  run({ title: 'a'.repeat(20000) + ' ' + Array.from({ length: 200 }, (_, i) => `issue #${i}`).join(' ') });
  assert.ok(Date.now() - t < 2000);
});
