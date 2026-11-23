<?php
/**
 * Strict, read-only preflight of the reviewed WordPress content bundle.
 * This is NOT the WordPress importer and does not modify the database.
 */
declare(strict_types=1);

$path = dirname(__DIR__) . '/data/reviewed-content.json';
if (!is_readable($path)) {
    fwrite(STDERR, "FMS: reviewed-content.json is missing or unreadable.\n");
    exit(1);
}
$json = file_get_contents($path);
if ($json === false) {
    fwrite(STDERR, "FMS: unable to read content bundle.\n");
    exit(1);
}
try {
    $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $exception) {
    fwrite(STDERR, "FMS: invalid JSON: " . $exception->getMessage() . "\n");
    exit(1);
}
if (!is_array($data) || empty($data['records']) || !is_array($data['records'])) {
    fwrite(STDERR, "FMS: bundle has no records.\n");
    exit(1);
}
$seen = [];
$validStatuses = ['draft', 'publish'];
$validTypes = ['post', 'fms_machine', 'fms_part'];
$numericFields = [
    'fms_engine_hp','fms_pto_hp','fms_pto_rpm','fms_hitch_lift_24_lb',
    'fms_hydraulic_flow_gpm','fms_loader_lift_lb','fms_operating_weight_lb','fms_fuel_capacity_gal',
];
foreach ($data['records'] as $index => $record) {
    $issue = static function (string $reason) use ($index): void {
        fwrite(STDERR, "FMS content record " . ($index + 1) . ": {$reason}\n");
        exit(1);
    };
    if (!is_array($record)) { $issue('not an object'); }
    $slug = $record['slug'] ?? null;
    $type = $record['type'] ?? null;
    $status = $record['status'] ?? 'draft';
    if (!is_string($slug) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) { $issue('invalid slug'); }
    if (!in_array($type, $validTypes, true)) { $issue('invalid post type'); }
    if (!in_array($status, $validStatuses, true)) { $issue('invalid publication status'); }
    if (!is_string($record['title'] ?? null) || strlen(trim($record['title'])) < 15) { $issue('missing/short title'); }
    if (!is_string($record['content'] ?? null) || strlen(trim($record['content'])) < 750) { $issue('content too short'); }
    $key = $type . ':' . $slug;
    if (isset($seen[$key])) { $issue('duplicate slug in content bundle'); }
    $seen[$key] = true;
    $src = $record['source_url'] ?? '';
    if (!is_string($src) || !filter_var($src, FILTER_VALIDATE_URL)
        || strtolower((string) parse_url($src, PHP_URL_SCHEME)) !== 'https') {
        $issue('missing/invalid HTTPS source URL');
    }
    if ($type === 'fms_part') {
        if (!is_string($record['part_number'] ?? null) || !preg_match('/^[A-Z0-9-]{4,40}$/D', $record['part_number'])) {
            $issue('missing or invalid OEM part number');
        }
        if (!is_string($record['brand'] ?? null) || trim($record['brand']) === '') {
            $issue('missing part manufacturer');
        }
        if (!is_string($record['serial_scope'] ?? null) || strlen(trim($record['serial_scope'])) < 10) {
            $issue('missing serial/model applicability notes');
        }
    }
    if ($type === 'fms_machine') {
        foreach (['brand','equipment_type','specs'] as $required) {
            if (empty($record[$required])) { $issue("missing machine field: {$required}"); }
        }
        if (!is_array($record['specs'])) { $issue('specifications must be an object'); }
        if (($record['specs']['fms_source_url'] ?? null) !== $src) { $issue('machine source URL mismatch'); }
        $date = $record['specs']['fms_source_checked'] ?? null;
        if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)) {
            $issue('missing or invalid source verification date');
        }
        foreach ($numericFields as $field) {
            if (array_key_exists($field, $record['specs'])) {
                $value = $record['specs'][$field];
                if (!is_scalar($value) || !is_numeric((string) $value) || (float) $value < 0) {
                    $issue("invalid numeric specification {$field}");
                }
            }
        }
    }
}

// Refuse to deploy broken links between version-controlled reference pages.
$knownPaths = [
    '/' => true,
    '/machines/' => true,
    '/parts/' => true,
    '/brands/' => true,
    '/compare/' => true,
    '/unit-converter/' => true,
    '/methodology/' => true,
    '/editorial-policy/' => true,
    '/about/' => true,
];
foreach (['maintenance', 'troubleshooting', 'guides', 'buying-guides',
          'comparisons', 'parts-compatibility'] as $category) {
    $knownPaths['/category/' . $category . '/'] = true;
}
foreach ($data['records'] as $record) {
    $prefix = $record['type'] === 'fms_machine' ? '/machines/' :
        ($record['type'] === 'fms_part' ? '/parts/' : '/');
    $knownPaths[$prefix . $record['slug'] . '/'] = true;
}
foreach ($data['records'] as $index => $record) {
    $matches = [];
    if (!preg_match_all('~href="(/[^"#?]+)"~i', $record['content'], $matches)) {
        continue;
    }
    foreach ($matches[1] as $href) {
        if (!isset($knownPaths[$href])) {
            fwrite(STDERR, "FMS record " . ($index + 1) .
                " (" . $record['slug'] . ") links to an unknown local URL: {$href}\n");
            exit(1);
        }
    }
}

printf("FMS content validation OK: %d reviewed records; %s\n", count($data['records']), hash('sha256', $json));
