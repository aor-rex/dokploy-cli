# dk — dokploy cli that works

Zero-dependency node cli for your dokploy server. Same shape as the
official `@dokploy/cli` (`dk <group> <action> --key value`), with the
request envelope fixed.

## why this exists

The official cli sends GET params as `?input=<params>` bare. Servers on
tRPC v11 reject that with `400` — every read with arguments fails
(`application one`, `read-logs`, `*.search`...), while POSTs go through
fine. This wraps params as `?batch=1&input={"0":{"json":...}}`, the same
envelope the dashboard itself uses. All 604 procedures in the spec work.

## install

Needs node 18+. No `npm install`, no deps.

```bash
curl -sSL https://raw.githubusercontent.com/aor-rex/dokploy-cli/main/install.sh | sh
```
or manual:
```bash
git clone https://github.com/aor-rex/dokploy-cli
cd dokploy-cli
chmod +x dk.js
ln -s "$PWD/dk.js" ~/.local/bin/dk   # or anywhere on PATH (needs `node`)
```

## auth

```bash
dk auth -u https://your-dokploy.host -t <api-token>
```

Saves to `dk-config.json` next to the script. Never commit that file.
Env also works: `DOKPLOY_URL` + `DOKPLOY_TOKEN` (or `DOKPLOY_API_KEY`).

## use

```bash
dk status                                        # all apps at a glance
dk application one --applicationId <id>
dk application deploy --applicationId <id>
dk application read-logs --applicationId <id> --tail 20
dk mounts listByServiceId --serviceId <id> --serviceType application
dk project all
dk <any-group> <any-action> [--key value ...] [--json]
```

`--app <name>` resolves short names if you add your own map in `dk.js`
(`URDHEIM` — replace with yours). `--json` dumps raw output.

## files

- `dk.js` — the whole cli, one file
- `dk-spec.json` — procedure → GET/POST map, generated from dokploy's
  openapi spec. Regenerate against your server version if commands 404:
  fetch `/api/openapi.json`, then map each path to its method.

## credit

Built on [`Dokploy/cli`](https://github.com/Dokploy/cli) — same command
shape and auth flow, with the GET request envelope fixed for tRPC v11
servers (see upstream issue #48). All credit for the design goes to them.

## license

MIT
