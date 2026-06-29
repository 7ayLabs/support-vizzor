# CLAUDE.md — support-vizzor

This repo is the implementation of `support.vizzor.ai`. It exists as a
separate repo from `site-vizzor` on purpose. Read this before making
architectural moves.

## What this is

A standalone Next.js 15 + React 19 app that serves the public
support surface for the Vizzor platform: ticket filing, feature
requests, improvement suggestions. Deployed on the same VPS as
site-vizzor but as an independent container at port **7130** (prod)
and **7131** (staging).

## Boundaries — what this repo does NOT do

- **No SIWS / signature verification.** Wallet identity is established
  by site-vizzor and handed off via the HS256 JWT in
  `lib/auth/sso.ts`. We never see a Solana signature.
- **No payment, subscription, watcher, or rate logic.** Those live in
  site-vizzor and (eventually) `vizzor-api`. Tickets are filed
  whether you have a paid sub or not.
- **No wallet adapter.** No `@solana/wallet-adapter-*`, no
  `@tonconnect/*`. The bundle stays small on purpose.
- **No shared database with site-vizzor.** Tickets live in their own
  SQLite at `/app/.support-data/support.db`. The only cross-service
  link is the optional `wallet_address` column populated from SSO.
- **No `app/(marketing)` route group or `[locale]` routing.** This is
  a single-locale (English) site at the moment. If/when we localize,
  introduce next-intl the same way site-vizzor does.

## Architecture rules

1. **Anonymous tickets are first-class.** A user without a wallet must
   be able to file a ticket. SSO is an enhancement, not a gate.
2. **Wallet binding happens server-side.** The form may include a
   `walletAddress` field, but `app/api/tickets/route.ts` overrides it
   with the SSO-derived address whenever the user is signed in. Users
   cannot file tickets "as" someone else.
3. **All inputs flow through `lib/tickets/sanitize.ts`.** Control
   characters out, length clamps in. JSX handles render-time escaping.
4. **Rate-limit every POST.** `lib/security/rate-limit.ts` keys by
   `HMAC(SUPPORT_RATE_LIMIT_SALT, ip)`. Defaults: 5 tickets / hour / IP.
5. **No untrusted X-Forwarded-For.** `lib/security/client-ip.ts` honors
   only the headers from `SUPPORT_TRUSTED_PROXIES` (the nginx peer).
6. **Health endpoint stays stable** — `/api/health` is wired to the
   deploy smoke test in `.github/workflows/deploy.yml`. Don't break
   the `{ status, subsystems.sqlite.ok }` JSON shape without updating
   the workflow.

## SSO contract

Cross-subdomain SSO uses an HS256 JWT handoff, not a shared cookie.
The contract lives in `docs/ops/sso-handoff.md`. Two implementation
sides:

- **support-vizzor (this repo)** — verifies the handoff token and
  mints a local `__Host-support.auth` session. Already implemented in
  `lib/auth/sso.ts` and `app/api/auth/sso/return/route.ts`.
- **site-vizzor (the other repo)** — has the matching `/auth/sso`
  origin route that mints the JWT after verifying its own SIWS
  cookie. **Not yet implemented.** Until it is, users can still file
  tickets anonymously; they just can't see "my tickets" linked to
  their wallet.

## Cybersecurity (first-class slice)

Per the saved feedback in the platform memory, security must be
designed in, not bolted on. The current posture:

- **CSP**: not yet customized (default Next.js). When the form gets
  client-side wallet signing or paste-image uploads, add a strict
  Content-Security-Policy with nonces.
- **OWASP A01 (Broken Access Control)**: server-side wallet override
  prevents impersonation; `/api/tickets/[id]` is intentionally public
  (codes are HMAC-mixed against `SUPPORT_TICKET_ID_SALT`, not
  sequential).
- **OWASP A03 (Injection)**: zod schema + length clamps + SQLite
  prepared statements throughout `lib/tickets/repo.ts`.
- **OWASP A05 (Security Misconfiguration)**: required secrets throw
  at boot in prod (`lib/env.ts`); non-root container user.
- **OWASP A07 (Auth Failures)**: HS256-only verifier rejects
  alg-confusion; timing-safe HMAC compare; 60-second handoff window.
- **NIST SP 800-63B**: session token rotation on logout (delete the
  `__Host-support.auth` cookie); 7-day TTL.

## Repo layout

```
support-vizzor/
├── app/                      # Next.js app router
│   ├── api/
│   │   ├── auth/me           # current identity
│   │   ├── auth/sso/return   # SSO handoff landing
│   │   ├── health            # liveness for deploy smoke + Docker
│   │   └── tickets           # POST + [id] GET
│   ├── new-ticket            # form page
│   ├── my-tickets            # SSO-only list
│   ├── tickets/[id]          # public ticket detail
│   └── page.tsx              # landing
├── components/               # client + server presentational pieces
├── lib/
│   ├── auth/                 # SSO handoff verifier, session issuer
│   ├── security/             # rate limit, client-ip resolver
│   ├── tickets/              # SQLite repo, code mint, sanitize
│   ├── env.ts                # strict env accessor
│   └── __tests__/            # vitest
├── docs/ops/                 # nginx, vps bootstrap, sso contract
├── scripts/                  # bootstrap-stack.sh
├── docker-compose*.yml       # base + prod + staging overlays
├── Dockerfile                # multi-stage, standalone output
└── .github/workflows/        # ci.yml + deploy.yml
```

## Operating it

Local dev: `pnpm install && pnpm dev` → http://localhost:3000.
Tests: `pnpm test` (vitest, node env).
Build smoke: `pnpm build && node .next/standalone/server.js`.
VPS deploy: push to `main` (prod) or `testing` (staging). CI handles
the rest.

## Future work (out of scope for v0.0.1)

- Site-vizzor side of the SSO handoff.
- Email digest of new tickets (probably via the same triage webhook).
- Public-facing ticket list (with consent), to demonstrate "we read
  these and ship".
- Comments / threading on tickets — would change the schema; not yet.
- Discord / Telegram bridge — handle via triage webhook → n8n.
- Sentry or similar error monitoring — wire after the first real
  user lands.
