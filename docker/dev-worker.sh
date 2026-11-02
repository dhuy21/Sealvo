#!/bin/sh
set -eu
cd /app/apps/api
# The schema is mounted from the host. The client in the image does not know tables added after the image was built.
npx prisma generate --schema=./prisma/schema.prisma
while [ ! -f dist/worker.js ]; do
  sleep 1
done
touch /tmp/ready
exec node --watch dist/worker.js
