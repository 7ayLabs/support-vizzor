# support-vizzor

`support.vizzor.ai` — the public ticketing, feature-request, and
improvement-suggestion surface for the Vizzor platform.

This is a thin standalone Next.js 15 app. It lives in its own repo on
purpose; see `CLAUDE.md` for the architectural rationale and
`docs/ops/sso-handoff.md` for how it talks to `vizzor.ai` for
identity.

## Quick start

```bash
pnpm install
cp .env.example .env.local        # fill in the three required secrets
pnpm dev                          # http://localhost:3000
```

Generate dev secrets locally:

```bash
echo "SUPPORT_RATE_LIMIT_SALT=$(openssl rand -hex 32)" >> .env.local
echo "SUPPORT_TICKET_ID_SALT=$(openssl rand -hex 32)"  >> .env.local
echo "SUPPORT_SSO_JWT_SECRET=$(openssl rand -hex 32)"  >> .env.local
```

## Scripts

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Next.js dev server on port 3000                  |
| `pnpm build`       | Production build (standalone output)             |
| `pnpm start`       | Run the standalone build                         |
| `pnpm test`        | Vitest, node env                                 |
| `pnpm typecheck`   | `tsc --noEmit`                                   |
| `pnpm lint`        | `next lint` (not yet configured)                 |

## Deploy

Push to `main` for prod (`support.vizzor.ai`, port 7130), push to
`testing` for staging (`test-support.vizzor.ai`, port 7131). The
GitHub Actions workflow builds the image, pushes to GHCR, SSHes to
the VPS, recreates the container, and smoke-tests `/api/health`.

First-time VPS bootstrap: `docs/ops/vps-bootstrap-support-vizzor.md`.

## What lives where

- **`app/`** — Next.js app router (pages + API routes)
- **`components/`** — presentational pieces (header, ticket form, auth badge)
- **`lib/auth/`** — SSO handoff verifier + local session issuer
- **`lib/security/`** — rate limit + trusted-proxy IP resolver
- **`lib/tickets/`** — SQLite repo, public-code minter, input sanitizer
- **`lib/__tests__/`** — vitest
- **`docs/ops/`** — nginx vhost, VPS bootstrap, SSO contract
- **`Dockerfile`** + **`docker-compose*.yml`** — runtime artifacts

## Platform context

Port allocation across the Vizzor stack (canonical map):

| Service          | Port |
| ---------------- | ---- |
| `vizzor-api`     | 7100 |
| `dashboard`      | 7110 |
| `site-vizzor`    | 7120 |
| **`support-vizzor`** | **7130** |
| `chronovisor`    | 7200 |
| `n8n`            | 7300 |
