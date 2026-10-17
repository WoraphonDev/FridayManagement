#!/usr/bin/env bash
# RV-18 runner: Linux + Docker + PostgreSQL 17 operations evidence (TC-075/076/077/078/080/081).
# Run from the repository root on a CLEAN Linux host, after creating deploy/.env (see docs/deploy-linux-docker.md).
#   scripts/rv18/run-rv18.sh all           deploy fresh stack + automated checks (TC-075/076/077/078, roles, recovery probe)
#   scripts/rv18/run-rv18.sh post-reboot   after rebooting the host: restart policy, HTTPS, persistence, cron/backup age (TC-080)
#   scripts/rv18/run-rv18.sh cleanup       remove the restore test database/container and harness secrets
# Manual steps (TC-080 reboot/DNS/certificate, TC-081 TTY recovery) are listed in scripts/rv18/README.md.
# Environment: RV18_ENV_FILE (default deploy/.env), RV18_PROJECT (default friday),
#              RV18_REHEARSAL=1 allows a non-Linux host; results are then labelled rehearsal and do not count.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT/deploy"
ENV_FILE=${RV18_ENV_FILE:-.env}
PROJECT=${RV18_PROJECT:-friday}
REHEARSAL=${RV18_REHEARSAL:-0}
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (copy deploy/.env.example)"; exit 2; }
set -a; . "./$ENV_FILE"; set +a
APP_ORIGIN=${FRIDAY_ORIGIN:-https://$FRIDAY_HOST}
INSECURE=0; [ "${FRIDAY_TLS:-}" = internal ] && INSECURE=1
DC=(docker compose -p "$PROJECT" --env-file "$ENV_FILE")
BACKUP_MOUNT="$ROOT/deploy/backups"
if [ "$REHEARSAL" = 1 ] && [ "$(uname -s)" != Linux ]; then
  # macOS bind mounts do not keep the node owner the snapshot code requires; rehearse with a named volume.
  printf 'services:\n  ops:\n    volumes: [appdata:/data, applogs:/logs, backups:/backups]\nvolumes:\n  backups: {}\n' >"$ROOT/deploy/.rv18-rehearsal.override.yml"
  DC+=(-f docker-compose.yml -f .rv18-rehearsal.override.yml)
  BACKUP_MOUNT="${PROJECT}_backups"
fi
NODE_IMAGE=node:22.23.3-bookworm-slim
CONFIRM=--confirm-local-maintenance
OUT_BASE="$ROOT/rv18-results"
mkdir -p "$OUT_BASE" && chmod 700 "$OUT_BASE"
OUT="$OUT_BASE/${RV18_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT" && chmod 700 "$OUT"
SUMMARY="$OUT/summary.tsv"
touch "$SUMMARY"

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$OUT/run.log"; }
record() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" >>"$SUMMARY"; log "[$2] $1 — $3"; }
psql_db() { "${DC[@]}" exec -T db psql -U "$DB_USER" -d "${2:-$DB_NAME}" -AtX -v ON_ERROR_STOP=1 -c "$1"; }
harness() { # harness <command> [arg] [url] [origin]
  docker run --rm --user "$(id -u):$(id -g)" --network "${PROJECT}_internal" \
    --add-host "$FRIDAY_HOST:172.30.0.10" \
    -e FRIDAY_URL="${3:-https://$FRIDAY_HOST}" -e FRIDAY_ORIGIN="${4:-$APP_ORIGIN}" \
    -e FRIDAY_INSECURE_TLS="$INSECURE" -v "$OUT:/state" -v "$ROOT/scripts/rv18:/h:ro" \
    "$NODE_IMAGE" node /h/harness.mjs "$1" /state "${2:-}" 2>&1 | tee -a "$OUT/run.log"
  return "${PIPESTATUS[0]}"
}
wait_healthy() {
  for _ in $(seq 1 60); do
    id=$("${DC[@]}" ps -q app)
    [ -n "$id" ] && [ "$(docker inspect -f '{{.State.Health.Status}}' "$id")" = healthy ] && return 0
    sleep 3
  done
  return 1
}
ops() { "${DC[@]}" run --rm -T ops "$@"; }

preflight() {
  local os; os=$(uname -s)
  if [ "$os" != Linux ] && [ "$REHEARSAL" != 1 ]; then echo "RV-18 needs a Linux host (set RV18_REHEARSAL=1 to rehearse)"; exit 2; fi
  {
    echo "profile=$([ "$REHEARSAL" = 1 ] && echo rehearsal || echo linux-docker-postgres17)"
    echo "date_utc=$(date -u +%FT%TZ)"
    echo "host_os=$(uname -srm)"
    [ -r /etc/os-release ] && grep -E '^(PRETTY_NAME)=' /etc/os-release
    echo "docker=$(docker version -f '{{.Server.Version}}')"
    echo "compose=$(docker compose version --short)"
    echo "git_commit=$(git -C "$ROOT" rev-parse HEAD)"
    echo "git_dirty=$(git -C "$ROOT" status --porcelain | wc -l | tr -d ' ')"
    echo "friday_host=$FRIDAY_HOST"
  } >"$OUT/environment.txt"
  cat "$OUT/environment.txt" | tee -a "$OUT/run.log"
  [ "$(git -C "$ROOT" status --porcelain | wc -l)" -eq 0 ] || log "WARNING: working tree is dirty; evidence must name the exact candidate"
}

deploy() {
  if [ -n "$(docker volume ls -q -f name="^${PROJECT}_pgdata$")" ]; then
    record deploy BLOCKED "volume ${PROJECT}_pgdata already exists; RV-18 needs a clean instance (fresh host, or another RV18_PROJECT on a disposable host)"
    exit 3
  fi
  "${DC[@]}" build app >>"$OUT/run.log" 2>&1
  "${DC[@]}" up -d db >>"$OUT/run.log" 2>&1
  "${DC[@]}" run --rm -T migrate >"$OUT/migrate-1.json" 2>&1
  "${DC[@]}" up -d app proxy >>"$OUT/run.log" 2>&1
  wait_healthy || { record deploy FAIL "app did not become healthy"; exit 4; }
  {
    echo "image_id=$(docker image inspect -f '{{.Id}}' friday-app:local)"
    echo "postgres=$(psql_db 'SHOW server_version')"
    echo "ledger_sha256=$(psql_db 'SELECT string_agg(id||sha256, chr(10) ORDER BY id) FROM schema_migrations' | sha256sum | cut -d' ' -f1)"
  } >>"$OUT/environment.txt"
  record deploy PASS "stack healthy; $(grep -c . "$OUT/migrate-1.json") migrate output line(s)"
}

roles_and_permissions() {
  local q
  q=$(psql_db "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user")
  echo "runtime_role_flags(super,createdb,createrole)=$q" >>"$OUT/roles.txt"
  local owns create
  owns=$(psql_db "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tableowner = current_user")
  create=$(psql_db "SELECT has_schema_privilege(current_user, 'public', 'CREATE')")
  echo "runtime_role_owned_tables=$owns schema_create=$create" >>"$OUT/roles.txt"
  local app_user; app_user=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$("${DC[@]}" ps -q app)" | sed -n 's/^DB_USER=//p')
  echo "app_db_user=$app_user migrate_db_user=$DB_USER" >>"$OUT/roles.txt"
  if [ "$q" = "f|f|f" ] && [ "$owns" = 0 ] && [ "$create" = f ]; then
    record roles PASS "runtime role cannot create/own schema objects"
  else
    record roles FAIL "runtime DB role can migrate (flags=$q owned_tables=$owns schema_create=$create); separate runtime/migration/backup roles are required"
  fi
  local appid; appid=$("${DC[@]}" ps -q app)
  docker inspect -f '{{range .Mounts}}{{.Destination}} {{end}}' "$appid" >"$OUT/app-mounts.txt"
  if grep -q '/backups' "$OUT/app-mounts.txt"; then record app-backup-isolation FAIL "app container mounts /backups"; else record app-backup-isolation PASS "app has no backup mount ($(cat "$OUT/app-mounts.txt"))"; fi
  docker exec "$appid" sh -c 'id -u; stat -c "%n %U %a" /data /logs' >"$OUT/app-permissions.txt"
  if [ "$(head -1 "$OUT/app-permissions.txt")" != 0 ]; then record app-nonroot PASS "$(tr '\n' ' ' <"$OUT/app-permissions.txt")"; else record app-nonroot FAIL "app runs as root"; fi
  local policy=""
  for s in db app proxy; do policy+="$s=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$("${DC[@]}" ps -q "$s")") "; done
  if [ "$(grep -o unless-stopped <<<"$policy" | wc -l)" -eq 3 ]; then record restart-policy PASS "$policy"; else record restart-policy FAIL "$policy"; fi
}

tc075() {
  local token; token=$("${DC[@]}" logs app 2>&1 | sed -n 's/.*setup token: \([0-9a-f]*\).*/\1/p' | tail -1)
  [ -n "$token" ] || { record TC-075 BLOCKED "no setup token in app log (instance not fresh)"; return; }
  harness seed "$token" && record seed PASS "synthetic fixture created" || { record seed FAIL "see run.log"; return; }
  "${DC[@]}" restart app >>"$OUT/run.log" 2>&1 && wait_healthy
  "${DC[@]}" restart >>"$OUT/run.log" 2>&1 && wait_healthy
  if harness check-persist; then record TC-075 PASS "data/org/file bytes persist after app and full-stack restart; Member 403; live body clean"; else record TC-075 FAIL "see harness-check-persist.json"; fi
}

tc076() {
  ops_root() { "${DC[@]}" run --rm -T --user root --entrypoint sh ops -c "$1"; }
  mkdir -p backups && ops_root "chown node:node /backups && chmod 700 /backups"
  SNAP=snap-rv18-$(date -u +%Y%m%d%H%M%S)
  harness writer 25 >"$OUT/writer.txt" 2>&1 & local wpid=$!
  sleep 4
  local start end rc=0
  start=$(date +%s)
  ops backup "/backups/$SNAP" "$CONFIRM" >"$OUT/backup.json" 2>&1 || rc=$?
  end=$(date +%s)
  wait "$wpid" && local wrc=0 || local wrc=$?
  local vrc=0; ops verify "/backups/$SNAP" "$CONFIRM" >"$OUT/verify.json" 2>&1 || vrc=$?
  echo "$SNAP" >"$OUT/snapshot-name.txt"
  # Failure injection: a 64 KiB tmpfs target must fail non-zero and leave the app writable.
  docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=64k,uid=1000,gid=1000,mode=0700 "${PROJECT}_rv18tiny" >/dev/null
  local frc=0
  "${DC[@]}" run --rm -T -v "${PROJECT}_rv18tiny:/tiny" ops backup /tiny/fail "$CONFIRM" >"$OUT/backup-fail.json" 2>&1 || frc=$?
  docker volume rm "${PROJECT}_rv18tiny" >/dev/null
  local after=0; harness writer 3 >"$OUT/writer-after-fail.txt" 2>&1 || after=$?
  local detail="backup rc=$rc in $((end - start))s, verify rc=$vrc, writer rc=$wrc, disk-full backup rc=$frc, writes after failure rc=$after"
  if [ $rc -eq 0 ] && [ $vrc -eq 0 ] && [ $wrc -eq 0 ] && [ $frc -ne 0 ] && [ $after -eq 0 ]; then record TC-076 PASS "$detail"; else record TC-076 FAIL "$detail"; fi
}

tc077() {
  local snap; snap=$(cat "$OUT/snapshot-name.txt")
  psql_db "DROP DATABASE IF EXISTS friday_restore" >/dev/null
  psql_db "CREATE DATABASE friday_restore" >/dev/null
  "${DC[@]}" run --rm -T --user root --entrypoint sh ops -c "rm -rf /backups/restore-data /backups/restore-logs && install -d -o node -g node -m 700 /backups/restore-data /backups/restore-logs"
  local start end rc=0
  start=$(date +%s)
  "${DC[@]}" run --rm -T -e DB_NAME=friday_restore -e DATA_DIR=/backups/restore-data \
    -e FRIDAY_RESTORE_SOURCE="/backups/$snap" ops restore-postgres /backups/restore-data "$CONFIRM" >"$OUT/restore.json" 2>&1 || rc=$?
  end=$(date +%s)
  [ $rc -eq 0 ] || { record TC-077 FAIL "restore rc=$rc"; return; }
  docker rm -f rv18-restore >/dev/null 2>&1 || true
  docker run -d --name rv18-restore --network "${PROJECT}_internal" --user node \
    -v "$BACKUP_MOUNT:/backups" \
    -e NODE_ENV=test -e HOST=0.0.0.0 -e PORT=3000 -e APP_ORIGIN=http://rv18-restore:3000 -e COOKIE_SECURE=false \
    -e DATA_DIR=/backups/restore-data -e LOG_DIR=/backups/restore-logs -e DB_PROVIDER=postgres -e DB_SERVER=db \
    -e DB_PORT=5432 -e DB_NAME=friday_restore -e DB_USER="$DB_USER" -e DB_PASSWORD="$DB_PASSWORD" -e DB_ENCRYPT=false \
    friday-app:local >/dev/null
  for _ in $(seq 1 40); do docker exec rv18-restore node -e "fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break; sleep 2; done
  if harness check-restored "" http://rv18-restore:3000 http://rv18-restore:3000; then
    record TC-077 PASS "restore in $((end - start))s; rows/bytes match; pre-backup sessions 401 (RPO/RTO under real schedule still to be recorded by the owner)"
  else record TC-077 FAIL "see harness-check-restored.json"; fi
  docker rm -f rv18-restore >/dev/null
}

tc078() {
  local before after rc=0
  before=$(psql_db 'SELECT string_agg(id||sha256, chr(10) ORDER BY id) FROM schema_migrations' | sha256sum | cut -d' ' -f1)
  "${DC[@]}" run --rm -T migrate >"$OUT/migrate-2.json" 2>&1 || rc=$?
  after=$(psql_db 'SELECT string_agg(id||sha256, chr(10) ORDER BY id) FROM schema_migrations' | sha256sum | cut -d' ' -f1)
  psql_db "DROP DATABASE IF EXISTS friday_migcopy" >/dev/null
  psql_db "CREATE DATABASE friday_migcopy" >/dev/null
  "${DC[@]}" exec -T db sh -c "pg_dump -U '$DB_USER' '$DB_NAME' | psql -q -U '$DB_USER' friday_migcopy" >>"$OUT/run.log" 2>&1
  # Control: the untouched copy must migrate cleanly, so a later failure is attributable to the checksum change.
  local crc=0
  "${DC[@]}" run --rm -T -e DB_NAME=friday_migcopy migrate >"$OUT/migrate-copy-control.json" 2>&1 || crc=$?
  psql_db "UPDATE schema_migrations SET sha256 = repeat('0', length(sha256)) WHERE id = (SELECT max(id) FROM schema_migrations)" friday_migcopy >/dev/null
  local mrc=0
  "${DC[@]}" run --rm -T -e DB_NAME=friday_migcopy migrate >"$OUT/migrate-mismatch.json" 2>&1 || mrc=$?
  psql_db "DROP DATABASE friday_migcopy" >/dev/null
  local prc=0; harness check-persist >/dev/null || prc=$?
  local detail="rerun rc=$rc ledger_unchanged=$([ "$before" = "$after" ] && echo yes || echo no), control copy rc=$crc, checksum-mismatch rc=$mrc, data after rerun rc=$prc; rollback = restore of the pre-upgrade snapshot (TC-077)"
  if [ $rc -eq 0 ] && [ "$before" = "$after" ] && [ $crc -eq 0 ] && [ $mrc -ne 0 ] && [ $prc -eq 0 ]; then record TC-078 PASS "$detail"; else record TC-078 FAIL "$detail"; fi
}

tc081_probe() {
  if harness probe-recovery; then record TC-081-probe PASS "no unauthenticated recovery route"; else record TC-081-probe FAIL "see harness-probe-recovery.json"; fi
  record TC-081 MANUAL_PENDING "run the TTY recovery in README step 4, then: scripts/rv18/run-rv18.sh old-session"
}

post_reboot() {
  local up=""; for s in db app proxy; do up+="$s=$(docker inspect -f '{{.State.Status}}' "$("${DC[@]}" ps -q "$s")") "; done
  wait_healthy && record reboot-autostart PASS "$up" || record reboot-autostart FAIL "$up"
  harness check-persist && record reboot-persist PASS "fixture intact after host reboot" || record reboot-persist FAIL "see run.log"
  local hdr; hdr=$(curl -sSI "https://$FRIDAY_HOST${HTTPS_PORT:+:$HTTPS_PORT}/" $([ $INSECURE = 1 ] && echo -k) | tr -d '\r')
  echo "$hdr" >"$OUT/https-headers.txt"
  grep -qi '^strict-transport-security' <<<"$hdr" && record https-headers PASS "HSTS present" || record https-headers FAIL "no HSTS"
  local issuer; issuer=$(echo | openssl s_client -connect "$FRIDAY_HOST:${HTTPS_PORT:-443}" -servername "$FRIDAY_HOST" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null || true)
  echo "$issuer" >"$OUT/certificate-issuer.txt"
  if [ "$REHEARSAL" = 1 ]; then record certificate REHEARSAL "$issuer"; elif grep -qi "let's encrypt" <<<"$issuer"; then record certificate PASS "$issuer"; else record certificate FAIL "issuer: $issuer"; fi
  local redirect; redirect=$(curl -s -o /dev/null -w '%{http_code}' "http://$FRIDAY_HOST${HTTP_PORT:+:$HTTP_PORT}/")
  [[ "$redirect" =~ ^30[178]$ ]] && record http-redirect PASS "HTTP $redirect" || record http-redirect FAIL "HTTP $redirect"
  if crontab -l 2>/dev/null | grep -q 'ops backup'; then record cron PASS "$(crontab -l | grep 'ops backup' | head -1)"; else record cron FAIL "no crontab entry calling 'ops backup'"; fi
  local newest; newest=$(find backups -maxdepth 1 -name 'snap-*' -type d -mmin -1560 | sort | tail -1)
  [ -n "$newest" ] && record scheduled-backup PASS "newest within 26h: $newest" || record scheduled-backup FAIL "no snapshot newer than 26h"
}

cleanup() {
  docker rm -f rv18-restore >/dev/null 2>&1 || true
  psql_db "DROP DATABASE IF EXISTS friday_restore" >/dev/null || true
  "${DC[@]}" run --rm -T --user root --entrypoint sh ops -c "rm -rf /backups/restore-data /backups/restore-logs" || true
  find "$OUT_BASE" -name harness-state.json -delete
  log "cleanup done: restore DB/container and harness credentials removed (results kept in $OUT_BASE)"
}

case "${1:-}" in
  all)
    preflight; deploy; roles_and_permissions; tc075; tc076; tc077; tc078; tc081_probe
    log "Automated phase finished. Next: manual steps in scripts/rv18/README.md, then post-reboot."
    ;;
  old-session) RV18_LAST=$(ls -1 "$OUT_BASE" | grep -v "$(basename "$OUT")" | tail -1); cp "$OUT_BASE/$RV18_LAST/harness-state.json" "$OUT/" 2>/dev/null
    harness check-old-session admin && record TC-081 PASS "pre-recovery Admin session revoked (owner confirmed login with new password)" || record TC-081 FAIL "old session still valid" ;;
  post-reboot) RV18_LAST=$(ls -1 "$OUT_BASE" | grep -v "$(basename "$OUT")" | tail -1); cp "$OUT_BASE/$RV18_LAST/harness-state.json" "$OUT/" 2>/dev/null; post_reboot ;;
  cleanup) cleanup ;;
  *) sed -n '2,9p' "$0"; exit 2 ;;
esac
log "Summary: $SUMMARY"
column -t -s $'\t' "$SUMMARY" 2>/dev/null || cat "$SUMMARY"
