#!/usr/bin/env node
// dk — dokploy helper, node port. Replicates the official @dokploy/cli
// shape (auth + apiGet/apiPost + group/action commands) with the GET
// envelope fixed: the official client sends ?input=<params> bare, which
// this server rejects. tRPC v11 wants ?batch=1&input={"0":{"json":...}}.
//
// Zero dependencies, uses global fetch (node 18+).
// Auth: DOKPLOY_URL + DOKPLOY_TOKEN (or DOKPLOY_API_KEY) env, else the
// config file written by `dk auth` next to this script.
//
// Usage:
//   dk auth -u <url> -t <token>
//   dk <group> <action> [--key value ...] [--json]
//   dk application one --applicationId <id>
//   dk application deploy --applicationId <id>
//   dk status   (shortcut: all urdheim services at a glance)

const fs = require("node:fs");
const path = require("node:path");

const HERE = __dirname;
const CONFIG_PATH = path.join(HERE, "dk-config.json");
const SPEC_PATH = path.join(HERE, "dk-spec.json");

const URDHEIM = {
  api: "eNefr-AaXJ-dst_OtkBkt",
  web: "0wofiS3kIHep3v96J5kkp",
  receiver: "lVe-KSGDXUYC1QS77hC9Y",
  poll: "8HM9o-T4lcTCNHJA_7q-T",
  snap: "r0BfKJY1LtHthRWylNLcz",
  listen: "go60VwNPDA4mkcS043Eor",
};

function readAuthConfig() {
  const token =
    process.env.DOKPLOY_TOKEN ||
    process.env.DOKPLOY_API_KEY ||
    process.env.DOKPLOY_AUTH_TOKEN;
  const url = process.env.DOKPLOY_URL;
  if (token && url) return { token, url };
  // fall back to saved config (token only; url may still come from env)
  if (fs.existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (cfg.token && (cfg.url || url)) return { token: cfg.token, url: cfg.url || url };
  }
  console.error("no auth. run: dk auth -u <url> -t <token>");
  process.exit(1);
}

// The fix: wrap GET params in the {json} envelope + batch=1,
// exactly how the dashboard's own client calls the server.
async function apiGet(endpoint, params) {
  const { token, url } = readAuthConfig();
  const input = params ? `?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: params } }))}` : "?batch=1&input=%7B%220%22%3Anull%7D";
  const res = await fetch(`${url}/api/trpc/${endpoint}${input}`, {
    headers: { "x-api-key": token },
  });
  if (!res.ok) throw new Error(`GET ${endpoint}: http ${res.status}`);
  const body = await res.json();
  return body[0].result.data.json;
}

async function apiPost(endpoint, data) {
  const { token, url } = readAuthConfig();
  const res = await fetch(`${url}/api/trpc/${endpoint}?batch=1`, {
    method: "POST",
    headers: { "x-api-key": token, "Content-Type": "application/json" },
    body: JSON.stringify({ 0: { json: data ?? null } }),
  });
  if (!res.ok) throw new Error(`POST ${endpoint}: http ${res.status}`);
  const body = await res.json();
  return body[0].result.data.json;
}

function coerce(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !isNaN(Number(v))) return Number(v);
  try { return JSON.parse(v); } catch { return v; }
}

async function main() {
  const argv = process.argv.slice(2);
  const [cmd, sub] = argv;

  if (cmd === "auth") {
    const u = argv[argv.indexOf("-u") + 1];
    const t = argv[argv.indexOf("-t") + 1];
    if (!u || !t || u.startsWith("-") || t.startsWith("-")) {
      console.error("usage: dk auth -u <url> -t <token>");
      process.exit(1);
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ url: u, token: t }, null, 2));
    console.log("saved.");
    return;
  }

  if (cmd === "status") {
    for (const [name, id] of Object.entries(URDHEIM)) {
      try {
        const app = await apiGet("application.one", { applicationId: id });
        console.log(`${name.padEnd(8)} ${app.applicationStatus} mounts=${(app.mounts || []).length} domains=${(app.domains || []).length}`);
      } catch (e) { console.log(`${name.padEnd(8)} ERR ${e.message}`); }
    }
    return;
  }

  if (!cmd || !sub || cmd.startsWith("-")) {
    console.error("usage: dk <group> <action> [--key value ...] [--json]");
    console.error("   eg: dk application one --applicationId <id>");
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
  const endpoint = `${cmd}.${sub}`;
  const method = spec[endpoint];
  if (!method) { console.error(`unknown: ${endpoint}`); process.exit(1); }

  const rawJson = argv.includes("--json");
  const params = {};
  for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith("--") || argv[i] === "--json") continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? coerce(argv[++i]) : true;
    params[key] = val;
  }
  // friendly: dk application one --app api  (name instead of id)
  if (params.app && URDHEIM[params.app] && !params.applicationId) {
    params.applicationId = URDHEIM[params.app];
    delete params.app;
  }

  try {
    const out = method === "GET" ? await apiGet(endpoint, params) : await apiPost(endpoint, params);
    if (rawJson || typeof out !== "string") console.log(JSON.stringify(out, null, 2).slice(0, 4000));
    else console.log(out);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
