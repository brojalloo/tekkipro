#!/usr/bin/env bash
set -euo pipefail

: "${VPS_HOST:?VPS_HOST absent}"
: "${VPS_USER:?VPS_USER absent}"
: "${VPS_SSH_KEY:?VPS_SSH_KEY absent}"
: "${VPS_KNOWN_HOSTS:?VPS_KNOWN_HOSTS absent}"
port=${VPS_PORT:-22}

if [[ ! $VPS_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ||
      ! $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ||
      ! $port =~ ^[1-9][0-9]{0,4}$ ]] || (( port > 65535 )); then
  echo 'Hôte, utilisateur ou port SSH invalide.' >&2
  exit 1
fi

umask 077
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
printf '%s\n' "$VPS_SSH_KEY" > "$ssh_dir/key"
printf '%s\n' "$VPS_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset VPS_SSH_KEY VPS_KNOWN_HOSTS
cat > "$ssh_dir/config" <<CONFIG
Host tekkipro-production
  HostName $VPS_HOST
  User $VPS_USER
  Port $port
  IdentityFile "$ssh_dir/key"
  UserKnownHostsFile "$ssh_dir/known_hosts"
  StrictHostKeyChecking yes
  IdentitiesOnly yes
  BatchMode yes
  ConnectTimeout 15
CONFIG

ssh -F "$ssh_dir/config" tekkipro-production \
  'test -r /opt/tekkipro/infra/.env && test -f /opt/tekkipro/infra/pgbouncer/userlist.txt && docker compose version && docker info --format "{{.ServerVersion}}"'

rsync -azR --delete \
  --exclude='node_modules/' --exclude='.env*' \
  --exclude='/backend/uploads/' --exclude='/infra/pgbouncer/userlist.txt' \
  --rsh="ssh -F $ssh_dir/config" \
  ./backend/ ./frontend/ ./infra/ tekkipro-production:/opt/tekkipro/

ssh -F "$ssh_dir/config" tekkipro-production bash -s < deploy/production/Apply-Vps.sh
