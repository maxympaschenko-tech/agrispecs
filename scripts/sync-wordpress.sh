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
# Fail safely before writing anything if a staged PHP file has a syntax error.
# The original Brands template contained an unescaped apostrophe and caused HTTP 500.
if ! command -v php >/dev/null 2>&1; then
  echo "PHP CLI unavailable; refusing to sync without syntax validation" >&2
  exit 1
fi
for source_dir in "$STAGE/wp-content/themes/fms-theme" "$STAGE/wp-content/plugins/fms-equipment-data"; do
  if [[ ! -d "$source_dir" ]]; then
    echo "Missing source directory: $source_dir" >&2
    exit 1
  fi
  # Portable: no Bash process substitution or /dev/fd dependency.
  # With -exec ... {} +, find propagates lint failures as a nonzero status.
  if ! find "$source_dir" -type f -name '*.php' -exec sh -c '
    for php_file do
      if ! php -l "$php_file" >/dev/null; then
        printf "PHP syntax error: %s\n" "$php_file" >&2
        exit 1
      fi
    done
  ' sh {} +; then
    echo "PHP validation failed; nothing was deployed." >&2
    exit 1
  fi
done

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
