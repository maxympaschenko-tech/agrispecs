#!/usr/bin/env bash
# Sync ONLY the FMS-owned theme and companion plugin to an existing WordPress site.
# Hostinger cron can run: bash /ABSOLUTE/PATH/public_html/fms-git-stage/scripts/sync-wordpress.sh
set -Eeuo pipefail

STAGE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DOCROOT="$(cd "$STAGE/.." && pwd -P)"
if [[ "$STAGE" != "$DOCROOT/fms-git-stage" ]]; then
  echo "Unexpected source folder; only fms-git-stage is allowed" >&2
  exit 1
fi
if [[ ! -f "$DOCROOT/wp-config.php" || ! -d "$DOCROOT/wp-includes" || ! -d "$DOCROOT/wp-content" ]]; then
  echo "No WordPress installation detected in $DOCROOT" >&2
  exit 1
fi
for kind in themes/fms-theme plugins/fms-equipment-data; do
  src="$STAGE/wp-content/$kind"
  dst="$DOCROOT/wp-content/$kind"
  if [[ ! -d "$src" ]]; then
    echo "Missing source: $src" >&2
    exit 1
  fi
  mkdir -p "$dst"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$src/" "$dst/"
  else
    # Fallback keeps older files; review when files are renamed/removed.
    cp -a "$src/." "$dst/"
  fi
  echo "Synced $kind"
done
printf 'FMS code synchronized at %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
