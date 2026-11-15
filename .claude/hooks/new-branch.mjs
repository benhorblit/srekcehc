// PreToolUse hook. Blocks creating a branch on origin unless it is
// `preview` or starts with `internal/`. It catches `git push` in Bash,
// which it reruns as `--dry-run --porcelain` so git itself resolves
// refspecs, upstreams and `HEAD`; a `*` line is a new ref. It also
// catches the GitHub MCP `create_branch` tool.
// Only the first try at a branch is blocked: any rerun in the same
// session passes. That is how Claude confirms a name it is sure of. If the check itself fails
// it lets the call through, since the push would fail the same way.
import { spawnSync } from 'node:child_process';
import {
  closeSync, constants, lstatSync, mkdirSync, openSync, readdirSync, readFileSync,
  statSync, unlinkSync, writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const allowed = (b) => b === 'preview' || b.startsWith('internal/');

// Shell-ish word split: enough for the git push commands Claude writes.
const words = (s) => (s.match(/'[^']*'|"(?:\\.|[^"])*"|\S+/g) ?? [])
  .map((w) => w.replace(/^'(.*)'$|^"(.*)"$/s, (_, a, b) => a ?? b));

// Branches each `git ... push ...` in the command would create on the remote.
function newBranches(command, cwd) {
  const found = [];
  for (const seg of command.split(/&&|\|\||[;|\n]/)) {
    const w = words(seg);
    const g = w.findIndex((x) => x === 'git' || x.endsWith('/git'));
    const p = w.indexOf('push', g + 1);
    if (g < 0 || p < 0) continue;
    const args = [];
    for (let i = p + 1; i < w.length; i++) {
      if (/^\d*[<>]/.test(w[i])) { if (/^\d*[<>]+&?$/.test(w[i])) i++; continue; } // redirects
      if (!/^(?:-u|--set-upstream|--dry-run|--porcelain|-n)$/.test(w[i])) args.push(w[i]);
    }
    const r = spawnSync('git', [...w.slice(g + 1, p), 'push', '--dry-run', '--porcelain', ...args],
      { cwd, encoding: 'utf8', timeout: 30000 });
    for (const line of (r.stdout ?? '').split('\n')) {
      const dst = line.startsWith('*') ? line.split('\t')[1]?.split(':')[1] : undefined;
      if (dst?.startsWith('refs/heads/')) found.push(dst.slice('refs/heads/'.length));
    }
  }
  return found;
}

// Returns true if this branch was blocked before in this session;
// otherwise records it.
function confirmed(session, branch) {
  const uid = process.getuid();
  const dir = join(tmpdir(), `claude-new-branch-${uid}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = lstatSync(dir);
  if (!st.isDirectory() || st.uid !== uid || st.mode & 0o077) throw new Error(`unsafe directory ${dir}`);
  for (const f of readdirSync(dir)) {
    try { if (Date.now() - statSync(join(dir, f)).mtimeMs > 864e5) unlinkSync(join(dir, f)); } catch {}
  }
  const file = join(dir, String(session ?? 'none').replace(/[^\w-]/g, '_'));
  let tried = [];
  try { tried = readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (tried.includes(branch)) return true;
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try { writeSync(fd, [...tried, branch].map((b) => b + '\n').join('')); } finally { closeSync(fd); }
  return false;
}

try {
  const hook = JSON.parse(readFileSync(0, 'utf8'));
  const input = hook.tool_input ?? {};
  let branches = [];
  if (hook.tool_name === 'Bash') {
    const cmd = String(input.command ?? '');
    if (/\bgit\b[\s\S]*\bpush\b/.test(cmd)) {
      branches = newBranches(cmd, hook.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
    }
  } else if (/create_branch$/.test(hook.tool_name ?? '') && typeof input.branch === 'string') {
    branches = [input.branch];
  }
  const bad = branches.filter((b) => !allowed(b) && !confirmed(hook.session_id, b));
  if (bad.length) {
    const names = bad.map((b) => `\`${b}\``).join(', ');
    console.error(
      `Blocked: this creates ${names} on origin. Pushed branches are permanent, and any ` +
        'outside `internal/` gets a public Cloudflare preview. Per CLAUDE.md: changes to ' +
        'published files go on `preview`, other work on a new `internal/` branch, never ' +
        '`claude/*`; a name the user explicitly gave wins. If you are sure, rerun unchanged.',
    );
    process.exit(2);
  }
} catch (e) {
  console.error(`new-branch hook failed, so the call was not checked: ${e.message}`);
}
