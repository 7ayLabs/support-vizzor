#!/usr/bin/env bash
# Bootstrap the support-vizzor compose stack on the VPS.
#
# Idempotent — re-running pulls the latest image and recreates the
# container without touching the SQLite volume. Reads required secrets
# from the host env (sourced from /opt/7aylabs/support-vizzor.env).

set -euo pipefail

cd /opt/7aylabs

ENV_FILE=/opt/7aylabs/support-vizzor.env
if [[ ! -f "$ENV_FILE" ]]; then
  cat >&2 <<EOM
ERROR: $ENV_FILE not found.

Create it with the required secrets:

  SUPPORT_RATE_LIMIT_SALT=...
  SUPPORT_TICKET_ID_SALT=...
  SUPPORT_SSO_JWT_SECRET=...
  SUPPORT_TRIAGE_WEBHOOK_URL=    # optional
  SUPPORT_TRUSTED_PROXIES=127.0.0.1,::1

Then re-run this script.
EOM
  exit 1
fi
# shellcheck disable=SC1091
set -a; source "$ENV_FILE"; set +a

TARGET="${1:-prod}"
case "$TARGET" in
  prod)    OVERLAY=docker-compose.prod.yml; SERVICE=support-vizzor;;
  staging) OVERLAY=docker-compose.staging.yml; SERVICE=support-vizzor-staging;;
  *) echo "Usage: $0 [prod|staging]" >&2; exit 1;;
esac

echo "▶  Bootstrapping $SERVICE ($TARGET)"
docker compose -f docker-compose.yml -f "$OVERLAY" pull "$SERVICE"
docker compose -f docker-compose.yml -f "$OVERLAY" up -d --no-deps --force-recreate "$SERVICE"

echo "▶  Waiting for health…"
for i in $(seq 1 12); do
  sleep 5
  PORT=$([[ "$TARGET" == "prod" ]] && echo 7130 || echo 7131)
  if curl -sf "http://127.0.0.1:$PORT/api/health" | jq -e '.status == "healthy"' >/dev/null; then
    echo "✓  $SERVICE healthy on port $PORT"
    exit 0
  fi
done

echo "✗  $SERVICE did not report healthy after 60s" >&2
exit 1
