# Cloudflare Deploy (Workers + Containers)

This folder contains the Worker source used by the root `wrangler.jsonc`.

## Why Containers

AssppWeb backend needs:

- WebSocket upgrades (`/wisp/`)
- filesystem writes for compiled IPA output
- long-running Node.js runtime behavior

Cloudflare Containers runs the existing Dockerized app with minimal changes.

## Deploy

```bash
npx wrangler login
npx wrangler deploy
```

For local preview on Cloudflare runtime:

```bash
npx wrangler dev
```

## Environment Variables

Set runtime configuration under the Worker's **Settings → Variables and
Secrets** page. The Worker forwards these values to the Container when the
Container starts. Wrangler is configured with `keep_vars` so Git deployments
preserve text variables added in the dashboard.

- `PUBLIC_BASE_URL`
- `UNSAFE_DANGEROUSLY_DISABLE_HTTPS_REDIRECT`
- `AUTO_CLEANUP_DAYS`
- `AUTO_CLEANUP_MAX_MB`
- `MAX_DOWNLOAD_MB`
- `DOWNLOAD_THREADS`
- `ACCESS_PASSWORD`

Store `ACCESS_PASSWORD` as a secret. The other values can be text variables.
Do not override `PORT` or `DATA_DIR`; the Cloudflare deployment requires port
`8080` and uses `/data` for the Container filesystem.

Environment variables are applied when the Container process starts. After
changing them, deploy again and allow the Container rollout to complete. To
force the single Container instance to restart immediately, deploy with:

```bash
npx wrangler deploy --containers-rollout=immediate
```

## Notes

- Deploy configuration lives in the repository root `wrangler.jsonc`.
- `cloudflare/src/index.ts` imports `@cloudflare/containers`.
- Root `wrangler.jsonc` runs a build command to install `@cloudflare/containers` automatically before deploy, so CI can still run plain `npx wrangler deploy`.
- The worker routes all HTTP and WebSocket traffic to one named container instance (`main`) to keep app state consistent.
- Container filesystem is ephemeral. Compiled packages may be lost when the container stops and restarts.

## Troubleshooting

If deploy logs fail after upload with:

```text
Deploy a container application
Unauthorized
```

the account/token used by CI is missing required permissions for Containers APIs.

Required account token permissions:

- `Workers Scripts Edit`
- `Containers Edit`
- `Cloudchamber Edit`

Also ensure the account is on a Workers Paid plan, since Containers are not available on Free.
