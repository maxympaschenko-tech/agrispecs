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
echo "=== Reviewed bundle reconciliation (read-only) ==="
export FMS_STAGE="$STAGE"
wp --path="$DOCROOT" --no-color eval '
    $bundle_path = getenv("FMS_STAGE") . "/data/reviewed-content.json";
    $bundle = json_decode(file_get_contents($bundle_path), true);
    if (!is_array($bundle) || !is_array($bundle["records"] ?? null)) {
        fwrite(STDERR, "Invalid staged content bundle\n");
        exit(1);
    }
    $present = 0; $not_published = 0; $missing = 0;
    $by_type = [];
    foreach ($bundle["records"] as $record) {
        $type = $record["type"];
        $slug = $record["slug"];
        $expected = $record["status"] ?? "draft";
        $by_type[$type] = ($by_type[$type] ?? 0) + 1;
        $post = get_page_by_path($slug, OBJECT, $type);
        if (!$post) {
            $missing++;
            echo "MISSING: {$type}/{$slug} (expected {$expected})\n";
        } elseif ($post->post_status !== $expected) {
            $not_published++;
            echo "STATUS MISMATCH: {$type}/{$slug} — {$post->post_status}, expected {$expected}\n";
        } else {
            $present++;
        }
    }
    echo "Bundle entries matching their expected status: {$present}\n";
    echo "Missing entries: {$missing}\n";
    echo "Status mismatches: {$not_published}\n";
    echo "Note: WordPress published counts may include pre-existing content not present in this bundle.\n";
'

echo "If Git-stage is older than GitHub main: inspect Hostinger Git Auto-deployment."
echo "If stage is current but WordPress is older: inspect Hostinger Cron logs and sync-wordpress.sh."
