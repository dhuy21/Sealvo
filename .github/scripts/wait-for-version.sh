#!/usr/bin/env bash
# Usage: wait-for-version.sh <health URL> <expected version> [jq path, default .version]
# A 200 alone could come from the previous deployment: wait until the endpoint reports this version.
set -euo pipefail

url=$1
expected=$2
field=${3:-.version}
timeout_seconds=600
deadline=$((SECONDS + timeout_seconds))

while true; do
  version=$(curl -fsS --max-time 10 "$url" | jq -r "$field // empty" 2>/dev/null || true)
  echo "$(date -u +%T) $field=${version:-none}"
  [ "$version" = "$expected" ] && exit 0
  ((SECONDS + 20 < deadline)) || break
  sleep 20
done

echo "$url did not report $field = $expected within $((timeout_seconds / 60)) minutes." >&2
exit 1
