<?php
/**
 * Import a small, reviewed set of source-backed farm-equipment content.
 *
 * Usage: wp eval-file scripts/import-reviewed-content.php --path=... (on Hostinger).
 * Called by the sync shell script after successful validation.
 * Idempotent: imported slugs are never overwritten, including editorial changes.
 */
if (!defined('ABSPATH')) {
    fwrite(STDERR, "WordPress is not loaded.\n");
    exit(1);
}
$site = untrailingslashit(home_url('/'));
if ($site !== 'https://farmmachinespecs.com') {
    fwrite(STDERR, "Refusing to import on unexpected site: {$site}\n");
    exit(1);
}
if (!post_type_exists('fms_machine') || !taxonomy_exists('fms_brand')) {
    fwrite(STDERR, "FMS Equipment Data plugin must be active.\n");
    exit(1);
}
$path = __DIR__ . '/../data/reviewed-content.json';
if (!is_readable($path)) {
    fwrite(STDERR, "Missing verified content bundle.\n");
    exit(1);
}
$json = file_get_contents($path);
$data = json_decode($json, true);
if (!is_array($data) || empty($data['records']) || !is_array($data['records'])) {
    fwrite(STDERR, "Invalid content bundle JSON.\n");
    exit(1);
}
/**
 * Attach a source-verified photograph to a seeded record.
 * Editors own the existing featured image; the importer only fills blanks.
 * Image URLs must be explicitly curated and attributed in the dataset.
 */
function fms_attach_reviewed_image(int $post_id, array $record): bool {
    if (has_post_thumbnail($post_id)) { return true; }
    $url = $record['image_url'] ?? '';
    $credit = $record['image_credit'] ?? '';
    $source = $record['image_source_url'] ?? '';
    $license = $record['image_license'] ?? '';
    if (!$url || !$credit || !$source || !$license) { return false; }
    if (!is_string($url) || !wp_http_validate_url($url) ||
        !is_string($source) || !wp_http_validate_url($source)) { return false; }
    $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
    // No arbitrary external fetches or untrusted upload endpoints.
    if (!in_array($host, ['commons.wikimedia.org', 'upload.wikimedia.org'], true)) { return false; }
    if (!function_exists('media_sideload_image')) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }
    $alt = sanitize_text_field($record['image_alt'] ?? $record['title'] ?? '');
    $attachment = media_sideload_image($url, $post_id, $alt, 'id');
    if (is_wp_error($attachment)) {
        error_log('FMS image import failed for ' . ($record['slug'] ?? '?') . ': ' . $attachment->get_error_message());
        return false;
    }
    $attachment_id = (int) $attachment;
    update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt);
    update_post_meta($attachment_id, '_fms_credit', sanitize_text_field($credit));
    update_post_meta($attachment_id, '_fms_license', sanitize_text_field($license));
    update_post_meta($attachment_id, '_fms_source_url', esc_url_raw($source));
    // Keep attribution visible on the attachment itself and the article.
    wp_update_post(['ID' => $attachment_id, 'post_excerpt' => sanitize_text_field($credit . ' — ' . $license),
        'post_content' => '<p>Photo: ' . esc_html($credit) . '. Licensed ' . esc_html($license) .
            '. <a href="' . esc_url($source) . '">Original image and license details</a>.</p>']);
    set_post_thumbnail($post_id, $attachment_id);
    echo 'Added local featured image: ' . ($record['slug'] ?? '?') . "\\n";
    return true;
}

$digest = hash('sha256', $json);
if (get_option('fms_content_bundle_digest') === $digest) {
    echo "Verified content bundle unchanged; no import necessary.\n";
    return;
}
$admin_ids = get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ids']);
$author = !empty($admin_ids) ? (int) $admin_ids[0] : 1;
$created = 0;
$skipped = 0;
foreach ($data['records'] as $record) {
    if (!is_array($record)) {
        throw new RuntimeException('Invalid record payload.');
    }
    $type = $record['type'] ?? '';
    $slug = sanitize_title($record['slug'] ?? '');
    $title = sanitize_text_field($record['title'] ?? '');
    if (!in_array($type, ['fms_machine', 'fms_part', 'post'], true) || !$slug || !$title) {
        throw new RuntimeException('Invalid content record type, slug or title.');
    }
    if (!empty($record['source_url'])) {
        $source_host = strtolower((string) wp_parse_url($record['source_url'], PHP_URL_HOST));
        if (empty($source_host) || !str_starts_with((string) $record['source_url'], 'https://')) {
            throw new RuntimeException('Invalid HTTPS source: ' . $slug);
        }
    } else {
        throw new RuntimeException('Missing source for: ' . $slug);
    }
    $existing = get_page_by_path($slug, OBJECT, $type);
    if ($existing) {
        // Backfill missing images, but never overwrite editors' text or thumbnails.
        fms_attach_reviewed_image((int) $existing->ID, $record);
        echo "Already exists; retaining edits: {$type}/{$slug}\n";
        $skipped++;
        continue;
    }
    $status = $record['status'] ?? 'draft';
    if (!in_array($status, ['draft', 'publish'], true)) {
        throw new RuntimeException('Invalid publication status: ' . $slug);
    }
    $id = wp_insert_post([
        'post_type'    => $type,
        'post_status'  => $status,
        'post_name'    => $slug,
        'post_title'   => $title,
        'post_excerpt' => wp_kses_post($record['excerpt'] ?? ''),
        'post_content' => wp_kses_post($record['content'] ?? ''),
        'post_author'  => $author,
        'comment_status' => 'closed',
    ], true);
    if (is_wp_error($id) || !$id) {
        throw new RuntimeException('Failed to create ' . $slug . ': ' . (is_wp_error($id) ? $id->get_error_message() : 'unknown error'));
    }
    update_post_meta($id, '_fms_reviewed_seed', $slug);
    if ($type === 'fms_machine') {
        foreach (['fms_engine_make','fms_engine_hp','fms_pto_hp','fms_pto_rpm','fms_hitch_category',
                  'fms_hitch_lift_24_lb','fms_hydraulic_flow_gpm','fms_operating_weight_lb','fms_fuel_capacity_gal',
                  'fms_configuration_notes','fms_source_url','fms_source_checked'] as $field) {
            if (isset($record['specs'][$field]) && $record['specs'][$field] !== '') {
                update_post_meta($id, $field,
                    $field === 'fms_source_url' ? esc_url_raw($record['specs'][$field]) : sanitize_text_field((string) $record['specs'][$field]));
            }
        }
        foreach (['fms_brand' => $record['brand'] ?? '', 'fms_equipment_type' => $record['equipment_type'] ?? ''] as $tax => $term_name) {
            $term_name = sanitize_text_field((string) $term_name);
            if ($term_name) {
                $term = term_exists($term_name, $tax);
                if (!$term) {
                    $term = wp_insert_term($term_name, $tax, ['slug' => sanitize_title($term_name)]);
                }
                if (is_wp_error($term)) {
                    throw new RuntimeException('Taxonomy error for ' . $slug . ': ' . $term->get_error_message());
                }
                wp_set_object_terms($id, (int) (is_array($term) ? $term['term_id'] : $term), $tax);
            }
        }
    } elseif ($type === 'fms_part') {
        // Parts are references, not automatic compatibility guarantees.
        foreach (['_fms_part_number' => 'part_number',
                  '_fms_serial_scope' => 'serial_scope'] as $meta_key => $record_key) {
            if (!empty($record[$record_key]) && is_scalar($record[$record_key])) {
                update_post_meta($id, $meta_key, sanitize_text_field((string) $record[$record_key]));
            }
        }
        update_post_meta($id, '_fms_primary_source', esc_url_raw($record['source_url']));
        $brand_name = sanitize_text_field((string) ($record['brand'] ?? ''));
        if ($brand_name !== '') {
            $term = term_exists($brand_name, 'fms_brand');
            if (!$term) {
                $term = wp_insert_term($brand_name, 'fms_brand', ['slug' => sanitize_title($brand_name)]);
            }
            if (is_wp_error($term)) {
                throw new RuntimeException('Part brand taxonomy error for ' . $slug . ': ' . $term->get_error_message());
            }
            wp_set_object_terms($id, (int) (is_array($term) ? $term['term_id'] : $term), 'fms_brand');
        }
    } else {
        $category_slugs = array_map('sanitize_title', $record['categories'] ?? ['guides']);
        $category_ids = [];
        foreach ($category_slugs as $category_slug) {
            $t = get_term_by('slug', $category_slug, 'category');
            if ($t) {
                $category_ids[] = (int) $t->term_id;
            }
        }
        if ($category_ids) {
            wp_set_post_categories($id, $category_ids, false);
        }
        update_post_meta($id, '_fms_primary_source', esc_url_raw($record['source_url']));
    }
    fms_attach_reviewed_image((int) $id, $record);
    echo "Created {$type}/{$slug} ({$status}, post ID {$id})\n";
    $created++;
}
update_option('fms_content_bundle_digest', $digest, false);
// Track only the public editorial dataset revision; never expose credentials or WP paths.
update_option('fms_public_catalog_version', sanitize_text_field((string) ($data['version'] ?? 'unversioned')), false);
echo "FMS verified import complete: {$created} created; {$skipped} retained.\n";
