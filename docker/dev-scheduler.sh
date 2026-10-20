#!/bin/sh
set -eu
cd /app/apps/api
while [ ! -f dist/scheduler.js ]; do
  sleep 1
done
touch /tmp/ready
exec node --watch dist/scheduler.js
