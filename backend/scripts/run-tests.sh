#!/bin/bash
# run-tests.sh — Lance les tests backend avec l environnement de test isolé
set -a
# shellcheck disable=SC1091
. "$(dirname "$0")/../.env.test"
set +a

echo "[test] NODE_ENV=$NODE_ENV"
echo "[test] JWT_SECRET length: $(printf "%s" "$JWT_SECRET" | wc -c) chars"
echo "[test] Running: node --test tests/*.test.js"
echo ""

exec node --test tests/*.test.js "$@"
