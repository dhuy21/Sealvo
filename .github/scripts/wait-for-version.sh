#!/usr/bin/env bash
# Usage: wait-for-version.sh <health URL> <expected version> [jq path, default .version] [stable seconds, default 0]
# A 200 alone could come from the previous deployment: wait until the endpoint reports this version.
# With stable seconds, the version must keep being reported that long: a heartbeat outlives its process
# by its TTL, so a process that beat once and then crashed must not pass.
set -euo pipefail

url=$1
expected=$2
field=${3:-.version}
stable_seconds=${4:-0}
timeout_seconds=600
deadline=$((SECONDS + timeout_seconds))
matched_since=

while true; do
  version=$(curl -fsS --max-time 10 "$url" | jq -r "$field // empty" 2>/dev/null || true)
  echo "$(date -u +%T) $field=${version:-none}"
  if [ "$version" = "$expected" ]; then
    matched_since=${matched_since:-$SECONDS}
    ((SECONDS - matched_since >= stable_seconds)) && exit 0
  else
    matched_since=
  fi
  ((SECONDS + 20 < deadline)) || break
  sleep 20
done

echo "$url did not report $field = $expected for ${stable_seconds}s within $((timeout_seconds / 60)) minutes." >&2
exit 1
