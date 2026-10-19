#!/bin/sh
set -eu
while [ ! -f /app/packages/shared/dist/index.js ]; do
  sleep 1
done
cd /app/apps/web
exec npx next dev --hostname 0.0.0.0 --port 3000
