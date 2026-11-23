#!/usr/bin/env bash
# Read-only Hostinger deployment diagnosis. Does not edit files or the WP database.
set -Eeuo pipefail
STAGE="$(cd "$(dirname "$0")/.." && pwd -P)"
DOCROOT="$(cd "$STAGE/.." && pwd -P)"

echo "=== Farm Machine Specs: publication diagnostics ==="
if [[ "$STAGE" != "$DOCROOT/fms-git-stage" ]]; then
  echo "Not running from the expected Hostinger Git stage folder." >&2
  exit 1
fi
if [[ ! -f "$STAGE/data/reviewed-content.json" ]]; then
  echo "Staged bundle missing; Hostinger Git deploy must finish." >&2
  exit 1
fi
if [[ ! -f "$DOCROOT/wp-config.php" ]]; then
  echo "WordPress root missing." >&2
  exit 1
fi
if ! command -v php >/dev/null 2>&1 || ! command -v wp >/dev/null 2>&1; then
  echo "PHP and WP-CLI must be available in PATH." >&2
  exit 1
fi
php -r '
    $data = json_decode(file_get_contents($argv[1]), true);
    if (!is_array($data)) { fwrite(STDERR, "Invalid staged bundle\n"); exit(1); }
    echo "Git-stage content bundle: " . ($data["version"] ?? "unversioned") . "\n";
    echo "Git-stage record count: " . count($data["records"] ?? []) . "\n";
' "$STAGE/data/reviewed-content.json"
wp --path="$DOCROOT" --no-color eval '
    $types = ["fms_machine"=>"machines", "post"=>"articles", "fms_part"=>"parts"];
    echo "Last completed WP content version: " . get_option("fms_public_catalog_version", "not tracked") . "\n";
    foreach ($types as $type => $label) {
        $counts = wp_count_posts($type);
        echo "Published " . $label . ": " . (int) ($counts->publish ?? 0) . "\n";
    }
    echo "Custom FMS plugin active: " . (post_type_exists("fms_machine") ? "yes" : "no") . "\n";
'
echo "If Git-stage is older than GitHub main: inspect Hostinger Git Auto-deployment."
echo "If stage is current but WordPress is older: inspect Hostinger Cron logs and sync-wordpress.sh."
