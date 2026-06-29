# SSO handoff contract — site-vizzor ↔ support-vizzor

## Why this exists

site-vizzor's auth cookie is `__Host-vizzor.auth`. The `__Host-`
prefix forbids the `Domain` attribute, which means the cookie is
**host-only** — `support.vizzor.ai` cannot read it directly. Cross-
subdomain SSO therefore needs a deliberate redirect-based handoff.

## Flow

```
support.vizzor.ai                vizzor.ai                       support.vizzor.ai
       │                             │                                  │
       │  GET /auth/sso?return_to=…  │                                  │
       │────────────────────────────▶│                                  │
       │                             │  verify __Host-vizzor.auth       │
       │                             │  mint HS256 JWT (60s, aud=...)   │
       │  302 ?token=<jwt>                                              │
       │◀───────────────────────────────────────────────────────────────│
       │                                                                │
       │  GET /api/auth/sso/return?token=<jwt>                          │
       │───────────────────────────────────────────────────────────────▶│
       │                                                                │  verifyHandoffToken()
       │                                                                │  set __Host-support.auth
       │  302 /?                                                        │
       │◀───────────────────────────────────────────────────────────────│
```

## JWT shape

```json
{
  "alg": "HS256",
  "typ": "JWT"
}.{
  "sub": "<wallet address>",
  "aud": "support.vizzor.ai",
  "iat": <unix seconds, now>,
  "exp": <unix seconds, now + 60>
}
```

- Signed HS256 with the shared `SUPPORT_SSO_JWT_SECRET`.
- The verifier rejects anything but `alg=HS256` (no alg-confusion).
- The verifier rejects `aud != "support.vizzor.ai"`.
- The verifier rejects `iat` more than 60s in the past (stale handoff).

## What site-vizzor needs to add (Phase A follow-up)

A new route at `vizzor.ai/auth/sso`:

```ts
// app/[locale]/(marketing)/auth/sso/page.tsx (Server Component)
// 1. Read current SIWS session via getActiveSession()
// 2. Validate return_to is on a hard-coded allow list:
//      ['https://support.vizzor.ai/api/auth/sso/return',
//       'https://test-support.vizzor.ai/api/auth/sso/return']
// 3. Mint HS256 JWT with the shared secret
// 4. 302 to <return_to>?token=<jwt>
// 5. If no session, redirect to /account?next=/auth/sso?...
```

The allow-list check is non-negotiable — without it, an attacker can
trick a logged-in user into minting a token for any URL they control.

## What support-vizzor already does

- `/api/auth/sso/return` verifies the handoff token (`lib/auth/sso.ts`).
- Sets `__Host-support.auth` cookie scoped to support.vizzor.ai.
- `/api/auth/me` reads the local cookie.
- All ticket routes call `readIdentity()` to attach the wallet server-side.

## Rotating the secret

1. Generate a new value with `openssl rand -hex 32`.
2. Update `/opt/7aylabs/support-vizzor.env` and the matching env on
   site-vizzor.
3. Restart **both** containers — neither side can verify tokens issued
   under the old secret. All currently-issued `__Host-support.auth`
   sessions are invalidated (HMAC mismatch → null).
4. Logged-in users get bounced to the sign-in flow once. Tickets are
   unaffected (no token in the storage path).
