// PreToolUse hook: blocks the first push in a session of a new branch that
// isn't `preview` or `internal/*`; reruns pass. A dry run resolves targets.
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { session_id, tool_input, cwd } = JSON.parse(readFileSync(0, 'utf8'));
const push = tool_input?.command?.match(/\bgit\b[^;&|\n]*?\bpush\b[^;&|<>\n]*/)?.[0];
if (!push) process.exit(0);
const dry = push.replace(/\s+\d*$/, '').replace(/\s(-u|--set-upstream)\b/g, '').replace(/\bpush\b/, 'push --dry-run --porcelain');
let out = '';
try { out = execSync(`${dry} 2>/dev/null`, { cwd, encoding: 'utf8' }); } catch (e) { out = e.stdout ?? ''; }
const log = join(tmpdir(), `claude-new-branch-${session_id}`);
let tried = []; try { tried = readFileSync(log, 'utf8').split('\n'); } catch {}
const bad = [...out.matchAll(/^\*\t[^:]+:refs\/heads\/(\S+)/gm)].map((m) => m[1])
  .filter((b) => b !== 'preview' && !b.startsWith('internal/') && !tried.includes(b));
if (!bad.length) process.exit(0);
appendFileSync(log, bad.join('\n') + '\n');
console.error(`Blocked: this creates ${bad.join(', ')} on origin. Pushed branches are permanent; any outside internal/ gets a public preview. Per CLAUDE.md: published-file changes go on preview, other work on internal/, never claude/*, unless the user named it. If sure, rerun.`);
process.exit(2);
