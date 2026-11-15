// PreToolUse hook. On GitHub, `#N` and `GH-N` link issue or PR N in
// titles, bodies, comments and commit messages, so one meant as "number
// N" posts a wrong link. It checks text sent by the GitHub MCP write
// tools; any GitHub tool without those text fields passes untouched.
//
// These pass:
//   - a closing keyword: Close #8, Fixes: #12, resolved #3
//   - a reference noun: issue #5, PRs #6, pull request #7
//   - a title ending in `[#8]`, `(#9)` or `[#8] (#9)`
//   - another repo's reference, owner/repo#9
//   - a chain on the same line after one of those: issues #3, #5 and #7
// Code is checked too: one in code gets confirmed by resending.
// Any other one blocks the call (exit 2). Resending the exact same call
// passes once: that is how Claude confirms a real reference the list
// missed, or sends anyway after the hook itself failed. Any error blocks.
import { createHash } from 'node:crypto';
import {
  closeSync, constants, lstatSync, mkdirSync, openSync, readdirSync, readFileSync,
  statSync, unlinkSync, writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fields = ['title', 'body', 'message', 'commit_title', 'commit_message'];

// Only the text just before a match is tested, so long text stays fast.
const lead = /(?:\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)[ \t]*:?|\b(?:issues?|PRs?|pull[ \t]+requests?))[ \t]*$/i;
const chain = /^[ \t]*(?:,[ \t]*(?:and|or)?|and|or|&)[ \t]*$/i;
const ref = /(?:(?<![\w/])#|(?<![\w/-])GH-)(\d+)\b/gi;
function check(field, text) {
  const firstLineEnd = (text + '\n').indexOf('\n');
  const bad = [];
  let prevEnd = -1;
  for (const m of text.matchAll(ref)) {
    const i = m.index;
    const end = i + m[0].length;
    const isTitle = field === 'title' || field === 'commit_title' ||
      (field === 'message' && i < firstLineEnd);
    const ok =
      lead.test(text.slice(Math.max(0, i - 40), i)) ||
      (prevEnd >= 0 && chain.test(text.slice(prevEnd, i))) ||
      (isTitle && i > 0 && /^(?:\[#\d+\][ \t]*)?(?:\(#\d+\))?[ \t]*$/.test(
        text.slice(i - 1, (text + '\n').indexOf('\n', i))) && /[[(]/.test(text[i - 1]));
    if (ok) prevEnd = end;
    else {
      const ctx = text.slice(Math.max(0, i - 30), end + 10).replace(/\s+/g, ' ').trim();
      bad.push(`${field}: "${m[0]}" in "…${ctx}…"`);
    }
  }
  return bad;
}

// Returns true, once, if this exact call was blocked before. Hashes live
// in a private per-user directory, one file per session, pruned daily.
function confirmed(hook, key) {
  if (!hook.session_id) return false;
  const uid = process.getuid();
  const dir = join(tmpdir(), `claude-issue-refs-${uid}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = lstatSync(dir);
  if (!st.isDirectory() || st.uid !== uid || st.mode & 0o077) {
    throw new Error(`unsafe directory ${dir}`);
  }
  for (const f of readdirSync(dir)) {
    try { if (Date.now() - statSync(join(dir, f)).mtimeMs > 864e5) unlinkSync(join(dir, f)); } catch {}
  }
  const file = join(dir, String(hook.session_id).replace(/[^\w-]/g, '_'));
  const hash = createHash('sha256').update(JSON.stringify([hook.tool_name, key])).digest('hex');
  let hashes = [];
  try { hashes = readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const seen = hashes.includes(hash);
  const rest = seen ? hashes.filter((h) => h !== hash) : [...hashes, hash];
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try { writeSync(fd, rest.map((h) => h + '\n').join('')); } finally { closeSync(fd); }
  return seen;
}

// The resend check runs first, so a resend still passes if anything
// after it throws.
let recorded = false;
try {
  const hook = JSON.parse(readFileSync(0, 'utf8'));
  const input = hook.tool_input ?? {};
  const present = fields.filter((f) => typeof input[f] === 'string');
  if (!present.length || confirmed(hook, input)) process.exit(0);
  recorded = Boolean(hook.session_id);
  const bad = present.flatMap((f) => check(f, input[f]));
  if (bad.length) {
    console.error(
      '`#N` and `GH-N` link issue or PR N on GitHub. Check each:\n' +
        bad.map((b) => `  - ${b}`).join('\n') +
        '\nIf every one is a real reference, resend unchanged. Otherwise remove the `#`.',
    );
    process.exit(2);
  }
} catch (e) {
  console.error(
    `issue-refs hook failed, so the call is blocked: ${e.message}` +
      (recorded ? '\nCheck it for accidental `#N` links yourself, then resend the call unchanged to send it anyway.' : ''),
  );
  process.exit(2);
}
