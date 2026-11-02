#!/bin/sh
set -eu
cd /app
# The shared dist volume starts empty and hides the copy baked into the image.
npx tsc -p packages/shared/tsconfig.build.json
npx tsc -p packages/shared/tsconfig.build.json --watch --preserveWatchOutput &
cd /app/apps/api
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma
# dist is the volume mount point. Nest's deleteOutDir removes that directory
# and fails with EBUSY, which exits the process.
node -e 'const fs=require("fs"); const p="nest-cli.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); j.compilerOptions.deleteOutDir=false; fs.writeFileSync(p, JSON.stringify(j,null,2));'
find dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
# The incremental cache still says those files are built. The next compile would skip them.
rm -f tsconfig.build.tsbuildinfo tsconfig.tsbuildinfo
exec npx nest start --watch
