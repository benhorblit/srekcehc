#!/usr/bin/env bun
/* Delete Cloudflare Pages deployments that should no longer be reachable.
 *
 * Pages keeps every build it ever ran at its own permanent
 * `<hash>.<project>.pages.dev`. The branch alias moves to the newest build;
 * the ones it moved off stay up, and deleting the branch retracts none of
 * them. Only a DELETE against the API does.
 *
 * Selectors, credentials and defaults: --help. The token and the secrets:
 * docs/pruner.md.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4';

// The one Pages project this repo publishes, hardcoded like the remote is: it
// is fixed, it is public (it is the <project> in the addresses), and the only
// thing a variable could add is a run pointed at somebody else's site by a
// typo, with a token that can delete projects.
const PROJECT = '{{SITE_NAME}}';

export const USAGE = `usage: bun scripts/prune-deployments.mjs [options]

The sweeps, which take no argument and are the policy:

  --branches            delete every deployment whose branch no longer exists
                        on the remote
  --commits             delete every commit build a branch alias has moved
                        off, keeping what the aliases point at now

Naming one thing, for something that reached the web and should not have.
One flag per kind of name, because a hex string is legal as more than one of
them: 3f2a1b9c can be a deployment's address and another's commit, and
abcdef1 can be a branch. Saying which you mean is the difference. They can be
given together, but not with a sweep: either you are naming what goes or you
are not.

  --deployment <id>     a Cloudflare identifier: a deployment id, its short
                        id, or the subdomain of an address it answers on
  --branch-rev <name>   a git branch, matched exactly
  --commit-rev <sha>    a git commit, 7-40 hex characters, as a prefix

  --delete              actually delete; without it nothing is touched
  --help

With no selector it runs both sweeps, which together leave each live branch
its current alias target and nothing else.

Environment: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (needs the
Cloudflare Pages: Edit permission). The project is ${PROJECT}, hardcoded, and
the remote is origin: a mistyped project is a delete run pointed at another
site, and another remote calls every branch it has not heard of gone.`;

export function parseArgs(argv) {
  const opts = { branches: false, commits: false, deployment: null,
                 branchRev: null, commitRev: null, apply: false, help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // A flag where a value belongs is a typo, and guessing at it is how the
    // wrong thing gets deleted.
    const value = () => {
      const next = argv[++i];
      if (!next || next.startsWith('-')) throw new Error(`${arg} needs a value`);
      return next;
    };
    switch (arg) {
      case '--branches': opts.branches = true; break;
      case '--commits': opts.commits = true; break;
      case '--deployment': opts.deployment = value(); break;
      case '--branch-rev': opts.branchRev = value(); break;
      case '--commit-rev': opts.commitRev = value(); break;
      case '--delete': opts.apply = true; break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error(`unknown option: ${arg}`);
    }
  }

  // Seven is git's own abbreviation floor; shorter stops meaning one commit.
  if (opts.commitRev !== null && !/^[0-9a-f]{7,40}$/i.test(opts.commitRev))
    throw new Error('--commit-rev takes 7 to 40 hex characters of a commit sha');

  const named = opts.deployment !== null || opts.branchRev !== null || opts.commitRev !== null;

  // A sweep deletes by policy and a name deletes what you typed. Mixing them
  // makes the printed list two different questions at once, and the moment to
  // notice that is before the run, not while reading what it did.
  if (named && (opts.branches || opts.commits))
    throw new Error('--branches and --commits sweep; --deployment, --branch-rev and ' +
                    '--commit-rev name one thing. Run them separately.');

  // No selector is the whole policy: each live branch keeps what its alias
  // points at, and nothing else survives.
  if (!opts.branches && !opts.commits && !named) {
    opts.branches = true;
    opts.commits = true;
  }
  return opts;
}

// `git ls-remote --heads` lines are "<sha>\trefs/heads/<branch>".
export const branchesFrom = stdout =>
  new Set(stdout.split('\n')
    .map(line => line.split('\t')[1])
    .filter(ref => ref?.startsWith('refs/heads/'))
    .map(ref => ref.slice('refs/heads/'.length)));

export const branchOf = deployment => deployment.deployment_trigger?.metadata?.branch ?? '';
export const commitOf = deployment => deployment.deployment_trigger?.metadata?.commit_hash ?? '';

const when = deployment => Date.parse(deployment.created_on ?? '') || 0;

// A build that failed before the deploy stage never took the alias off
// whatever was holding it.
export const deployed = deployment =>
  deployment.latest_stage?.name === 'deploy' && deployment.latest_stage?.status === 'success';

/* The two namespaces a deployment can be named by.
 *
 * The API filters by neither: the list call takes a page number and the
 * delete call takes a deployment id, so both of these are matched here,
 * against records already in memory.
 *
 * They are kept apart because a hex string is legal in both. The hash in a
 * `<hash>.<project>.pages.dev` URL is, in Cloudflare's words, "a randomly
 * generated hash" — it is not the commit, so nothing but the record ties that
 * URL to any git object, and `3f2a1b9c` could as easily be a sha. Asking
 * which namespace a value came from is what makes that unambiguous.
 */
const subdomain = url => {
  try { return new URL(url).hostname.split('.')[0].toLowerCase(); } catch { return ''; }
};

// Cloudflare's own: the id, the short id, and every address it answers on —
// its random hash, and the branch alias if it is holding one.
export function isDeployment(deployment, id) {
  const wanted = id.toLowerCase();
  return [deployment.id, deployment.short_id, subdomain(deployment.url ?? ''),
          ...(deployment.aliases ?? []).map(subdomain)]
    .filter(Boolean)
    .some(value => value.toLowerCase() === wanted);
}

/* Git's names are taken one kind at a time, never inferred from the value's
 * shape: abcdef1 is a legal branch name and a legal abbreviated sha, and
 * guessing between them in a tool that deletes things is how the wrong thing
 * goes. --branch-rev matches a branch exactly, as git compares them.
 * --commit-rev matches a sha by prefix, validated as hex when it is parsed.
 *
 * An address like preview-oops-here is not a git name even though Cloudflare
 * built it from one, so it belongs to --deployment, which reads the aliases
 * off the record instead of reconstructing the rule that made them.
 */

/* The deployments a branch alias could currently be pointing at — what
 * --commits must not touch. Three signals, and any one of them holds a
 * deployment, because keeping a build nobody needed costs a URL nobody has
 * while dropping the wrong one takes down a live address:
 *
 *   1. `aliases`, the API's own answer. Trusted when present but not alone:
 *      it is not promised in a list response, and an empty array read as
 *      "nothing points here" would delete every alias target in the project.
 *   2. The newest build on the branch, where the alias goes by definition.
 *   3. The newest build that actually deployed, for a branch whose last
 *      pushes failed to build.
 */
export function aliasHolders(deployments) {
  const byBranch = new Map();
  for (const deployment of deployments) {
    const branch = branchOf(deployment);
    if (!branch) continue;
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch).push(deployment);
  }

  const held = new Set();
  for (const deployment of deployments)
    if ((deployment.aliases ?? []).length) held.add(deployment.id);

  for (const list of byBranch.values()) {
    const newest = list.slice().sort((a, b) => when(b) - when(a));
    held.add(newest[0].id);
    const succeeded = newest.find(deployed);
    if (succeeded) held.add(succeeded.id);
  }
  return held;
}

/* Which deployments go, and why each one was picked.
 *
 * `live` is what the site is serving. Those are reported as `spared` rather
 * than dropped silently — a match you were not told about is worse than one
 * you were.
 *
 * A deployment with no branch in its trigger metadata is never swept: there
 * is nothing to compare against the remote, and "I could not tell" must not
 * read as "it is gone".
 */
export function select(deployments, { liveBranches = new Set(), productionBranch = '',
                                      branches = false, commits = false,
                                      deployment: named = null, branchRev = null,
                                      commitRev = null, live = new Set() } = {}) {
  const doomed = [];
  const spared = [];
  const held = commits ? aliasHolders(deployments) : new Set();


  for (const deployment of deployments) {
    const branch = branchOf(deployment);
    const why = [];

    if (named && isDeployment(deployment, named)) why.push(`${named} is its Cloudflare id`);

    if (branchRev && branch === branchRev) why.push(`${branchRev} is its branch`);

    if (commitRev && commitOf(deployment).toLowerCase().startsWith(commitRev.toLowerCase()))
      why.push(`${commitRev} is its commit`);

    // Production is off limits to the sweep whatever the remote says: it is
    // the one branch not supposed to be gone, and deleting the live site is
    // not the fix. Naming it with --branch-rev still works.
    const gone = branches && deployment.environment !== 'production' && branch &&
                 branch !== productionBranch && !liveBranches.has(branch);
    if (gone) why.push(`branch ${branch} no longer exists`);

    /* A commit build with the alias gone off it: reachable at its own hash and
     * nowhere else, which is the pile this is meant to clear.
     *
     * Only one that actually deployed. A build that stopped short of the
     * deploy stage put nothing on the web, so deleting it retracts nothing
     * and loses the record that it was skipped. A gone branch is the
     * exception, and --branches is what takes those.
     *
     * That reason is not given for a gone branch either: every build on one
     * goes regardless, so saying the alias moved states a fact about a branch
     * the line above just called non-existent, and changes nothing. */
    if (commits && branch && !held.has(deployment.id) && !gone && deployed(deployment))
      why.push(`not the newest build on ${branch}`);

    if (!why.length) continue;
    if (live.has(deployment.id))
      spared.push({ deployment, why: why.join(' and '), because: 'the site is serving it' });
    else
      doomed.push({ deployment, why: why.join(' and ') });
  }

  return { doomed, spared };
}

/* Color, because a list of addresses is read for the one line that should
 * not be in it. Off when NO_COLOR is set or stdout is not a terminal, on when
 * FORCE_COLOR is — which is what the workflow sets, since it captures the
 * output and Actions renders the escapes itself.
 */
const color = (() => {
  const env = globalThis.process?.env ?? {};
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR) return true;
  return Boolean(process.stdout?.isTTY);
})();

const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
export const bold = text => paint('1', text);
export const dim = text => paint('2', text);
export const red = text => paint('31', text);
export const green = text => paint('32', text);
export const yellow = text => paint('33', text);

/* The same list as a markdown table, for the job summary — a run page that
 * says what went without anyone opening a log. Written by the script rather
 * than parsed back out of its own output by the workflow: the fields are
 * here, already apart.
 */
export function summaryTable(doomed, spared) {
  const row = (mark, { deployment, why, because }) =>
    `| ${mark} | \`${deployment.short_id ?? deployment.id.slice(0, 8)}\` | ` +
    `${deployment.environment ?? '?'} | ${stageOf(deployment)} | ${branchOf(deployment) || '—'} | ` +
    `\`${commitOf(deployment).slice(0, 7) || '—'}\` | ${(deployment.created_on ?? '').slice(0, 10)} | ` +
    `${why}${because ? `, but ${because}` : ''} |`;

  if (!doomed.length && !spared.length) return 'Nothing selected.\n';

  return ['| | id | env | stage | branch | commit | built | why |',
          '| --- | --- | --- | --- | --- | --- | --- | --- |',
          ...doomed.map(entry => row('🗑', entry)),
          ...spared.map(entry => row('✅', entry))].join('\n') + '\n';
}

/* The stage is in here because whether a build went up is the difference
 * between a public copy of the site and a row in an API: `deploy/success` is
 * something to retract, anything else is a record of a build that did not
 * happen. */
export const stageOf = deployment =>
  deployment.latest_stage?.name
    ? `${deployment.latest_stage.name}/${deployment.latest_stage.status ?? '?'}`
    : '-';

export const describe = deployment =>
  [deployment.short_id ?? deployment.id.slice(0, 8),
   deployment.environment ?? '?',
   stageOf(deployment),
   commitOf(deployment).slice(0, 7) || '-',
   (deployment.created_on ?? '').slice(0, 10),
   branchOf(deployment) || '(no branch)',
   deployment.url ?? ''].join('  ');

// Encoded because these are interpolated into a URL. Neither has room for
// anything that needs it, which is the assumption worth not making in a
// function that deletes things.
export const projectPath = (account, project) =>
  `/accounts/${encodeURIComponent(account)}/pages/projects/${encodeURIComponent(project)}`;

async function api(path, { token, method = 'GET', search = {} }) {
  const url = new URL(API + path);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));

  const response = await fetch(url, { method, headers: { authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));

  // A Cloudflare error is a 200 with success:false as often as it is a 4xx.
  if (!response.ok || body.success === false) {
    const detail = (body.errors ?? []).map(e => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`${method} ${path} failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
  return body;
}

/* Every deployment in the project, both environments.
 *
 * No per_page. This endpoint rejects it — `HTTP 400, 8000024: Invalid list
 * options provided` for per_page=100 — so the page size is whatever Cloudflare
 * feels like giving, and the loop takes what it is given. Cloudflare's own
 * docs put no bounds on the parameter, which is how it got in here; the API
 * is the authority, not the reference.
 *
 * Stopping on result_info rather than on a short page matters all the more
 * for that: the page size is now unknown, so a short page means nothing. */
export async function listDeployments({ account, project, token }) {
  const path = `${projectPath(account, project)}/deployments`;
  const all = [];

  for (let page = 1; page <= 400; page++) {
    const body = await api(path, { token, search: { page } });
    const batch = body.result ?? [];
    all.push(...batch);

    const info = body.result_info ?? {};
    if (!batch.length) break;
    if (info.total_pages && page >= info.total_pages) break;
    if (info.total_count && all.length >= info.total_count) break;
    // Neither count reported and a page that is not full of anything: there
    // is no signal left to continue on.
    if (!info.total_pages && !info.total_count) break;
  }
  return all;
}

export async function getProject({ account, project, token }) {
  return (await api(projectPath(account, project), { token })).result;
}

// force=true is required: a plain delete refuses an aliased deployment, which
// is exactly what a gone branch leaves behind for --branches.
export const deleteDeployment = ({ account, project, token }, id) =>
  api(`${projectPath(account, project)}/deployments/${encodeURIComponent(id)}`,
      { token, method: 'DELETE', search: { force: 'true' } });

/* The remote is the authority on what still exists, and it is always origin:
 * a run pointed at some other remote would call every branch it had not heard
 * of gone. A bad answer here deletes every preview in the project, so
 * anything that goes wrong throws. */
export function liveBranches() {
  const stdout = execFileSync('git', ['ls-remote', '--heads', 'origin'], { encoding: 'utf8' });
  const branches = branchesFrom(stdout);
  if (!branches.size) throw new Error('origin reported no branches; refusing to call anything stale');
  return branches;
}

export async function main(argv, env) {
  const opts = parseArgs(argv);
  if (opts.help) { console.log(USAGE); return 0; }

  const ctx = {
    account: env.CLOUDFLARE_ACCOUNT_ID,
    project: PROJECT,
    token: env.CLOUDFLARE_API_TOKEN,
  };
  for (const [name, value] of [['CLOUDFLARE_ACCOUNT_ID', ctx.account],
                               ['CLOUDFLARE_API_TOKEN', ctx.token]])
    if (!value) throw new Error(`${name} is not set\n\n${USAGE}`);

  const project = await getProject(ctx);
  const deployments = await listDeployments(ctx);

  // canonical_deployment is the newest production build, latest_deployment the
  // newest of any kind. Both are what a visitor gets right now.
  const live = new Set([project.canonical_deployment?.id, project.latest_deployment?.id].filter(Boolean));

  const { doomed, spared } = select(deployments, {
    liveBranches: opts.branches ? liveBranches() : new Set(),
    productionBranch: project.production_branch,
    branches: opts.branches,
    commits: opts.commits,
    deployment: opts.deployment,
    branchRev: opts.branchRev,
    commitRev: opts.commitRev,
    live,
  });

  console.log(bold(`${project.name}: ${deployments.length} deployment(s), ` +
                   `${doomed.length} to delete`));
  for (const { deployment, why } of doomed) {
    console.log(`  ${describe(deployment)}  ${yellow(`— ${why}`)}`);
    for (const alias of deployment.aliases ?? []) console.log(dim(`      alias ${alias}`));
  }
  for (const { deployment, why, because } of spared)
    console.log(`  ${green('KEPT')}  ${describe(deployment)}  ${dim(`— ${why}, but ${because}`)}`);

  // The run page, when there is one. The heading above it is the workflow's.
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, summaryTable(doomed, spared));

  if (!doomed.length) return 0;
  if (!opts.apply) {
    console.log(`\n${yellow('nothing was deleted.')} Re-run with --delete to remove the above.`);
    return 0;
  }

  let failed = 0;
  for (const { deployment } of doomed) {
    const id = deployment.short_id ?? deployment.id;
    try {
      await deleteDeployment(ctx, deployment.id);
      console.log(`${green('deleted')} ${id}`);
    } catch (error) {
      failed++;
      console.error(`${red('FAILED')} ${id}: ${error.message}`);
      // An annotation, so a failed delete is on the run page and not only in
      // the log: the deployment is still public, which is the thing to know.
      if (env.GITHUB_ACTIONS)
        console.log(`::error title=Not deleted::${id} is still up: ${error.message}`);
    }
  }
  console.log(bold(`deleted ${doomed.length - failed} of ${doomed.length}`));
  return failed ? 1 : 0;
}

// Importable; only runs when it is the thing that was executed.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2), process.env).catch(error => {
    console.error(error.message);
    return 1;
  });
}
