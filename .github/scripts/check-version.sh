#!/usr/bin/env bash
# Fails unless the web and the API both report VERSION now (BASE_URL/health and API_URL/health).
set -euo pipefail

: "${VERSION:?VERSION is empty}"
for url in "${BASE_URL:?BASE_URL is empty}/health" "${API_URL:?API_URL is empty}/health"; do
  version=$(curl -fsS --max-time 10 "$url" | jq -r '.version // empty' 2>/dev/null || true)
  if [ "$version" != "$VERSION" ]; then
    echo "::error::$url reports ${version:-no version}, not $VERSION: another deploy is running, so this result would not test $VERSION" >&2
    exit 1
  fi
done
echo "Web and API run $VERSION"
