#!/usr/bin/env bash
set -euo pipefail
cd /opt/tekkipro/infra
docker compose config --quiet
docker compose build --pull backend frontend

# Copy logos from the old container before the first restart with a volume.
if docker container inspect tekkipro_api >/dev/null 2>&1 &&
   [[ $(docker container inspect --format '{{range .Mounts}}{{if eq .Destination "/app/uploads"}}{{.Name}}{{end}}{{end}}' tekkipro_api) != tekkipro_uploads_data ]]; then
  docker cp tekkipro_api:/app/uploads/. - |
    docker compose run --rm -T --no-deps --user 0 --entrypoint tar backend -xpf - -C /app/uploads
fi

docker compose up -d --no-build --wait --wait-timeout 240
curl --fail --silent --show-error --max-time 10 \
  --resolve tekkipro.com:443:127.0.0.1 https://tekkipro.com/api/health
