// Password gate for the WHOLE site. As a root `_middleware.js`, Cloudflare
// Pages runs this on every request, static assets included. Only the
// crawler opt-out files below are served without the password.
//
// The cookie never stores the password itself, only a SHA-256 hash of it.
// Valid for 1 month.

const PASSWORD = "{{SITE_PASSWORD}}";
const COOKIE_NAME = "site_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 1 month

// Files whose entire job is telling crawlers to go away. Gating them would
// mean no bot ever reads them. Matched exactly: no prefix is opened up.
const PUBLIC_PATHS = new Set([
  "/robots.txt",
  "/ai.txt",
  "/llms.txt",
  "/.well-known/ai.txt",
  "/.well-known/tdmrep.json",
]);

// _headers only decorates static assets, so every response the gate makes
// re-attaches it by hand. Keep in step with site/_headers. The CSP differs
// only where the login page needs it: inline style, a form posting here.
const OPT_OUT_HEADERS = {
  "cache-control": "no-store",
  "content-signal": "search=no, ai-input=no, ai-train=no, use=immediate",
  "content-usage": "train-ai=n, search=n",
  "tdm-reservation": "1",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

const GATE_HEADERS = { "content-type": "text/html; charset=utf-8", ...OPT_OUT_HEADERS };

async function expectedToken() {
  const data = new TextEncoder().encode(`site-auth:${PASSWORD}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function loginPage(showError) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex">
<meta name="tdm-reservation" content="1">
<title>Locked</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         max-width: 20rem; margin: 20vh auto; padding: 0 1.5rem; line-height: 1.5; }
  h1 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; }
  input { width: 100%; padding: 0.5rem; font-size: 1rem; box-sizing: border-box;
          border: 1px solid #999; border-radius: 6px; background: transparent; color: inherit; }
  button { margin-top: 0.6rem; width: 100%; padding: 0.5rem; font-size: 1rem;
           border: none; border-radius: 6px; background: #111; color: #fff; cursor: pointer; }
  @media (prefers-color-scheme: dark) { button { background: #eee; color: #111; } }
  p.error { color: #d33; font-size: 0.85rem; margin-top: 0.5rem; }
</style></head><body>
<h1>Password required</h1>
<form method="POST">
  <input type="password" name="password" autofocus required>
  <button type="submit">Enter</button>
  ${showError ? '<p class="error">Wrong password.</p>' : ""}
</form>
</body></html>`;
}

const gate = (showError) =>
  new Response(loginPage(showError), { status: 401, headers: GATE_HEADERS });

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  const token = await expectedToken();

  if (getCookie(request, COOKIE_NAME) === token) {
    return next();
  }

  if (request.method !== "POST") {
    return gate(false);
  }

  // A POST that isn't a form must gate, not throw a 500 out of the worker.
  let form;
  try {
    form = await request.formData();
  } catch {
    return gate(false);
  }

  if (form.get("password") !== PASSWORD) {
    return gate(true);
  }

  // Land back on whatever was asked for. "//evil.example" is a valid
  // pathname a browser follows off-site, so only a single leading slash.
  const safePath = /^\/(?:[^/\\].*)?$/.test(url.pathname);
  const headers = new Headers({
    Location: safePath ? url.pathname + url.search : "/",
    ...OPT_OUT_HEADERS,
  });
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );
  return new Response(null, { status: 303, headers });
}
