# VPS bootstrap — support-vizzor

Greenfield VPS provisioning for `support.vizzor.ai` (port 7130) and
`test-support.vizzor.ai` (port 7131). Assumes the host already runs
the site-vizzor stack (this is the same VPS, `159.198.70.125`, under
`/opt/7aylabs`).

## 1. DNS

Point both subdomains at the VPS:

```
support.vizzor.ai          A     <VPS IP>
test-support.vizzor.ai     A     <VPS IP>
```

## 2. Secrets

On the VPS, drop a env file at `/opt/7aylabs/support-vizzor.env`:

```bash
SUPPORT_RATE_LIMIT_SALT=$(openssl rand -hex 32)
SUPPORT_TICKET_ID_SALT=$(openssl rand -hex 32)
SUPPORT_SSO_JWT_SECRET=$(openssl rand -hex 32)
# Optional triage webhook (n8n / Slack / Linear):
SUPPORT_TRIAGE_WEBHOOK_URL=
SUPPORT_TRUSTED_PROXIES=127.0.0.1,::1
```

Mode `600`, owned by the deploy user. **The SSO JWT secret must also
be set in site-vizzor's env with the same value** — that's how the
handoff verifies (HS256, shared secret).

## 3. Compose files

Copy the three compose files into `/opt/7aylabs/`:

```bash
# from the support-vizzor checkout on your laptop
scp docker-compose.yml docker-compose.prod.yml docker-compose.staging.yml \
    deploy@<VPS>:/opt/7aylabs/
```

(Compose files live on the VPS, not in this repo's deploy artifact —
the repo only publishes the Docker image.)

## 4. nginx + TLS

```bash
sudo cp docs/ops/nginx/support.vizzor.ai.conf \
        /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/support.vizzor.ai.conf \
           /etc/nginx/sites-enabled/
sudo certbot --nginx -d support.vizzor.ai -d test-support.vizzor.ai
sudo nginx -t && sudo systemctl reload nginx
```

## 5. First boot

```bash
cd /opt/7aylabs
./scripts/bootstrap-stack.sh prod      # binds 127.0.0.1:7130
./scripts/bootstrap-stack.sh staging   # binds 127.0.0.1:7131
```

The script waits up to 60s for `/api/health` to return `healthy`.

## 6. Smoke

```bash
curl -s https://support.vizzor.ai/api/health | jq
curl -s https://test-support.vizzor.ai/api/health | jq
```

Expected: `status: "healthy"`, `subsystems.sqlite.ok: true`.

## 7. Subsequent deploys

CI pushes a new image and SSHes in to recreate. No manual step needed.

## Rollback

```bash
cd /opt/7aylabs
# Find the previous immutable tag (gh ghcr ls or the deploy logs)
PREV_SHA=<short-sha>
docker tag ghcr.io/7aylabs/support-vizzor:${PREV_SHA} \
           ghcr.io/7aylabs/support-vizzor:latest
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --no-deps --force-recreate support-vizzor
```

Tickets persist across rollbacks — the SQLite volume `support-vizzor-db`
is independent of the image.
