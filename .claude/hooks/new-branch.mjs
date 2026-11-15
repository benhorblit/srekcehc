// PreToolUse hook: blocks the first push in a session of a new branch that
// isn't `preview` or `internal/*`; reruns pass. A dry run resolves targets.
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { session_id, tool_name, tool_input, cwd } = JSON.parse(readFileSync(0, 'utf8'));
let branches = tool_name?.endsWith('create_branch') ? [tool_input.branch] : [];
for (const [push] of String(tool_input?.command ?? '').matchAll(/\bgit\b[^;&|\n]*?\bpush\b[^;&|<>\n]*/g)) {
  const dry = push.replace(/\s+\d*$/, '').replace(/\s(-u|--set-upstream)\b/g, '').replace(/\bpush\b/, 'push --dry-run --porcelain');
  let out = '';
  try { out = execSync(`${dry} 2>/dev/null`, { cwd, encoding: 'utf8' }); } catch (e) { out = e.stdout ?? ''; }
  branches.push(...[...out.matchAll(/^\*\t[^:]+:refs\/heads\/(\S+)/gm)].map((m) => m[1]));
}
const log = join(tmpdir(), `claude-new-branch-${session_id}`);
let tried = []; try { tried = readFileSync(log, 'utf8').split('\n'); } catch {}
const bad = branches.filter((b) => b !== 'preview' && !b.startsWith('internal/') && !tried.includes(b));
if (!bad.length) process.exit(0);
appendFileSync(log, bad.join('\n') + '\n');
console.error(`Blocked: this creates ${bad.join(', ')} on origin. Pushed branches are permanent; any outside internal/ gets a public preview. Per CLAUDE.md: published-file changes go on preview, other work on internal/, never claude/*, unless the user named it. If sure, rerun.`);
process.exit(2);
