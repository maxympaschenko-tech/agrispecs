#!/usr/bin/env bash
# Idempotent bootstrap; --check is read only.
set -Eeuo pipefail
ACTION="--check"
if [[ "$#" -gt 0 ]]; then ACTION="$1"; fi
if [[ "$ACTION" != "--apply" && "$ACTION" != "--check" ]]; then echo "Use --check or --apply" >&2; exit 2; fi
STAGE="$(cd "$(dirname "$0")/.." && pwd -P)"
ROOT="$(cd "$STAGE/.." && pwd -P)"
if [[ "$STAGE" != "$ROOT/fms-git-stage" || ! -f "$ROOT/wp-config.php" ]]; then echo "Unexpected WordPress root" >&2; exit 1; fi
command -v wp >/dev/null || { echo "WP CLI not available" >&2; exit 1; }
W=(wp --path="$ROOT" --no-color)
"${W[@]}" core is-installed >/dev/null
SITE="$("${W[@]}" option get home)"
case "$SITE" in https://farmmachinespecs.com|https://farmmachinespecs.com/|http://farmmachinespecs.com|http://farmmachinespecs.com/) ;; *) echo "Unexpected site: $SITE" >&2; exit 1;; esac
echo "Target: $SITE"
ensure_page() {
 local slug="$1" title="$2" existing
 existing="$("${W[@]}" post list --post_type=page --post_status=any --name="$slug" --format=ids | head -n 1)"
 if [[ -n "$existing" ]]; then echo "Page exists: $slug"; return; fi
 if [[ "$ACTION" == "--check" ]]; then echo "Would create page: $slug"; return; fi
 "${W[@]}" post create --post_type=page --post_status=publish --post_name="$slug" --post_title="$title" --post_content="$(cat "$STAGE/scripts/pages/$slug.html")" --porcelain >/dev/null
 echo "Created page: $slug"
}
ensure_category() {
 local slug="$1" title="$2" existing
 existing="$("${W[@]}" term list category --slug="$slug" --field=term_id | head -n 1)"
 if [[ -n "$existing" ]]; then echo "Category exists: $slug"; return; fi
 if [[ "$ACTION" == "--check" ]]; then echo "Would create category: $slug"; return; fi
 "${W[@]}" term create category "$title" --slug="$slug" --porcelain >/dev/null
 echo "Created category: $slug"
}
if [[ "$ACTION" == "--apply" ]]; then
 "${W[@]}" option update blogname "Farm Machine Specs"
 "${W[@]}" option update blogdescription "Tractor specs, maintenance, troubleshooting and comparisons"
 "${W[@]}" rewrite structure '/%postname%/'
fi
ensure_category troubleshooting "Troubleshooting"
ensure_category maintenance "Maintenance"
ensure_category guides "Guides"
ensure_category buying-guides "Buying Guides"
ensure_category comparisons "Comparisons"
ensure_category parts-compatibility "Parts & Compatibility"
ensure_page brands "Brands"
ensure_page compare "Compare Farm Equipment"
ensure_page unit-converter "Farm Equipment Unit Converter"
ensure_page methodology "Data Methodology"
ensure_page editorial-policy "Editorial Policy"
ensure_page about "About Farm Machine Specs"
if [[ "$ACTION" == "--apply" ]]; then "${W[@]}" rewrite flush >/dev/null; echo "Bootstrap complete. Existing posts and pages preserved."; fi
