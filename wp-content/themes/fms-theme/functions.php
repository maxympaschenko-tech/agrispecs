<?php
if (!defined('ABSPATH')) { exit; }
function fms_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
    add_theme_support('html5', ['search-form','comment-form','comment-list','gallery','caption','style','script']);
    add_theme_support('custom-logo', ['height'=>70,'width'=>320,'flex-height'=>true,'flex-width'=>true]);
    register_nav_menus(['primary'=>__('Primary navigation','fms')]);
    add_image_size('fms-card', 640, 400, true);
}
add_action('after_setup_theme','fms_theme_setup');
function fms_theme_assets() {
    $theme_dir = get_template_directory();
    $style_file = $theme_dir . '/style.css';
    $script_file = $theme_dir . '/assets/site.js';
    $style_version = is_file($style_file) ? (string) filemtime($style_file) : '1.0.1';
    $script_version = is_file($script_file) ? (string) filemtime($script_file) : '1.0.1';
    wp_enqueue_style('fms-style', get_stylesheet_uri(), [], $style_version);
    wp_enqueue_script('fms-navigation', get_template_directory_uri().'/assets/site.js', [], $script_version, true);
}
add_action('wp_enqueue_scripts','fms_theme_assets');
function fms_theme_excerpt_length(){return 22;}
add_filter('excerpt_length','fms_theme_excerpt_length',999);
function fms_card($post_id) {
    $id=(int)$post_id; $type=get_post_type($id);
    echo '<article class="data-card"><span class="kicker">'.esc_html($type==='fms_machine'?'Machine specs':($type==='fms_part'?'Parts reference':'Practical guide')).'</span>';
    if (has_post_thumbnail($id)) {
        echo '<a class="fms-card-photo" href="'.esc_url(get_permalink($id)).'">' .
          get_the_post_thumbnail($id, 'fms-card', ['loading' => 'lazy', 'decoding' => 'async']) . '</a>';
        $photo_id = get_post_thumbnail_id($id);
        $photo_credit = get_post_meta($photo_id, '_fms_credit', true);
        $photo_license = get_post_meta($photo_id, '_fms_license', true);
        $photo_source = get_post_meta($photo_id, '_fms_source_url', true);
        if ($photo_credit && $photo_license && $photo_source) {
            echo '<small class="fms-card-credit">Photo: ' . esc_html($photo_credit) .
                 ' · ' . esc_html($photo_license) . ' · <a href="' .
                 esc_url($photo_source) . '" target="_blank" rel="license noopener noreferrer">Source</a></small>';
        }
    }
    echo '<a href="'.esc_url(get_permalink($id)).'"><h3>'.esc_html(get_the_title($id)).'</h3></a>';
    if($type==='fms_machine') {
        $power=get_post_meta($id,'fms_engine_hp',true);
        $pto=get_post_meta($id,'fms_pto_hp',true);
        $lift=get_post_meta($id,'fms_loader_lift_lb',true);
        $weight=get_post_meta($id,'fms_operating_weight_lb',true);
        $rpm=get_post_meta($id,'fms_pto_rpm',true);
        $hitch=get_post_meta($id,'fms_hitch_category',true);
        $types=wp_get_post_terms($id,'fms_equipment_type',['fields'=>'names']);
        if (!is_wp_error($types) && $types) {
            echo '<p class="tagline">'.esc_html(implode(' · ',$types)).'</p>';
        }
        if($power!=='' || $pto!=='' || $lift!=='' || $weight!=='' || $rpm!=='' || $hitch!=='') {
            echo '<div class="card-meta">';
            if($power!=='') echo '<span>'.esc_html($power).' engine HP</span>';
            if($pto!=='') echo '<span>'.esc_html($pto).' PTO HP</span>';
            if($lift!=='') echo '<span>'.esc_html($lift).' lb loader lift*</span>';
            if($weight!=='') echo '<span>'.esc_html($weight).' lb listed weight</span>';
            if($rpm!=='' && $power==='') echo '<span>'.esc_html($rpm).' rpm PTO</span>';
            if($hitch!=='' && $power==='') echo '<span>'.esc_html($hitch).'</span>';
            echo '</div>';
            if($lift!=='') echo '<p class="tagline">*See measurement position and configuration.</p>';
        }
        if (!has_post_thumbnail($id) || $power==='') {
            echo '<p>'.esc_html(wp_trim_words(get_the_excerpt($id),30)).'</p>';
        }
    } else {
        echo '<p>'.esc_html(wp_trim_words(get_the_excerpt($id),20)).'</p>';
    }
    echo '<a class="read-more" href="'.esc_url(get_permalink($id)).'">View details →</a></article>';
}


/**
 * Fallback SEO metadata while no dedicated SEO plugin is active.
 * Disable these fallback tags automatically if Yoast, Rank Math or AIOSEO is installed.
 */
function fms_theme_has_seo_plugin() {
    return defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION') ||
        (function_exists('aioseo') && is_callable('aioseo'));
}
function fms_theme_description() {
    if (is_front_page()) {
        return 'Independent US tractor and farm equipment specs, maintenance guides, fault diagnostics, parts references and machine comparisons.';
    }
    if (is_post_type_archive('fms_machine')) {
        return 'Find verified tractor and agricultural equipment specs by brand and model, including engine HP, PTO, hitch, hydraulic flow and machine weight.';
    }
    if (is_post_type_archive('fms_part')) {
        return 'Browse farm machine parts references and documented compatibility notes. Confirm OEM numbers and exact serial ranges before ordering.';
    }
    if (is_tax('fms_brand')) {
        $term = get_queried_object();
        return $term && !is_wp_error($term) ? sprintf('Browse %s tractor and farm equipment models with published specifications, source notes and model comparisons.', $term->name) : '';
    }
    if (is_category()) {
        $term = get_queried_object();
        if (!$term || is_wp_error($term)) { return ''; }
        $descriptions = [
            'maintenance' => 'Tractor service and maintenance references: oil capacities, OEM filter kits, serial-number checks and owner checklists based on manufacturer documentation.',
            'troubleshooting' => 'Practical farm tractor troubleshooting: start with engine symptoms and safety checks before choosing parts or calling for repair.',
            'comparisons' => 'Compare tractor engine horsepower, PTO, hitch capacity and weight, with manufacturer source notes and realistic buying considerations.',
            'buying-guides' => 'Source-checked compact tractor buying guides and equipment comparisons for US property owners and small farms.',
            'parts-compatibility' => 'Find manufacturer part numbers, filter kits, model-specific fitment notes and serial restrictions before ordering tractor parts.',
            'guides' => 'Owner guides for tractors and agricultural machinery: maintenance, troubleshooting, technical specifications and safer buying decisions.',
        ];
        return $descriptions[$term->slug] ?? sprintf('Explore practical %s articles and tractor equipment guidance for US farm and property owners.', $term->name);
    }
    if (is_singular()) {
        $id = get_queried_object_id();
        $excerpt = get_post_field('post_excerpt', $id);
        $value = $excerpt !== '' ? $excerpt : get_post_field('post_content', $id);
        $value = trim(wp_strip_all_tags(strip_shortcodes($value)));
        if ($value === '') {
            $value = get_the_title($id) . ': farm equipment information and source-based reference.';
        }
        return wp_html_excerpt($value, 155, '…');
    }
    return '';
}
function fms_theme_meta_tags() {
    if (is_admin() || is_feed() || fms_theme_has_seo_plugin()) {
        return;
    }
    $description = fms_theme_description();
    if ($description === '') {
        return;
    }
    echo '<meta name="description" content="' . esc_attr($description) . '">' . "\n";
    if (is_front_page()) {
        echo '<link rel="canonical" href="' . esc_url(home_url('/')) . '">' . "\n";
    }
    if (is_front_page() || is_singular()) {
        echo '<meta property="og:type" content="' . (is_front_page() ? 'website' : 'article') . '">' . "\n";
        echo '<meta property="og:title" content="' . esc_attr(wp_get_document_title()) . '">' . "\n";
        echo '<meta property="og:description" content="' . esc_attr($description) . '">' . "\n";
        echo '<meta property="og:url" content="' . esc_url(is_front_page() ? home_url('/') : get_permalink()) . '">' . "\n";
        $id = get_queried_object_id();
        if ($id && has_post_thumbnail($id)) {
            $image = get_the_post_thumbnail_url($id, 'large');
            if ($image) {
                echo '<meta property="og:image" content="' . esc_url($image) . '">' . "\n";
            }
        }
    }
}
add_action('wp_head', 'fms_theme_meta_tags', 4);

/* One-administrator website has no standalone author profiles worth indexing. */
function fms_theme_hide_user_sitemap($provider, $name) {
    if ($name === 'users') {
        return false;
    }
    return $provider;
}
add_filter('wp_sitemaps_add_provider', 'fms_theme_hide_user_sitemap', 10, 2);


/**
 * Schema.org fallbacks for factual machine records and practical editorials.
 * No reviews, offers, author credentials or prices are invented.
 */
function fms_theme_structured_data() {
    if (is_admin() || fms_theme_has_seo_plugin() || !is_singular(['fms_machine','post'])) {
        return;
    }
    $id = get_queried_object_id();
    if (!$id || get_post_status($id) !== 'publish') {
        return;
    }
    $url = get_permalink($id);
    $website = [
        '@type' => 'Organization',
        'name' => 'Farm Machine Specs',
        'url' => home_url('/'),
    ];
    $common = [
        '@context' => 'https://schema.org',
        'name' => get_the_title($id),
        'url' => $url,
        'mainEntityOfPage' => $url,
        'description' => fms_theme_description(),
    ];
    if (get_post_type($id) === 'fms_machine') {
        $schema = array_merge($common, ['@type' => 'Product']);
        $brands = wp_get_post_terms($id, 'fms_brand');
        if (!is_wp_error($brands) && $brands) {
            $schema['brand'] = ['@type' => 'Brand','name' => $brands[0]->name];
        }
        if (has_post_thumbnail($id)) {
            $image = get_the_post_thumbnail_url($id, 'full');
            if ($image) { $schema['image'] = $image; }
        }
        $spec_fields = [
            'fms_engine_hp' => 'Rated engine horsepower (HP; verify rating standard)',
            'fms_pto_hp' => 'PTO horsepower (HP)',
            'fms_hitch_category' => 'Three-point hitch category',
            'fms_hitch_lift_24_lb' => 'Hitch lift capacity at 24 inches (lb)',
            'fms_hydraulic_flow_gpm' => 'Published hydraulic flow (US GPM; see source notes)',
            'fms_operating_weight_lb' => 'Manufacturer-listed tractor weight (lb; see configuration)',
            'fms_fuel_capacity_gal' => 'Fuel capacity (US gallons)',
        ];
        $properties = [];
        foreach ($spec_fields as $key => $label) {
            $value = get_post_meta($id, $key, true);
            if ($value !== '') {
                $properties[] = ['@type' => 'PropertyValue', 'name' => $label, 'value' => (string) $value];
            }
        }
        if ($properties) { $schema['additionalProperty'] = $properties; }
        $source = get_post_meta($id, 'fms_source_url', true);
        if ($source) { $schema['subjectOf'] = ['@type' => 'CreativeWork', 'url' => esc_url_raw($source)]; }
    } else {
        $schema = array_merge($common, [
            '@type' => 'TechArticle',
            'datePublished' => get_post_time('c', true, $id),
            'dateModified' => get_post_modified_time('c', true, $id),
            'author' => $website,
            'publisher' => $website,
            'isAccessibleForFree' => true,
        ]);
        $source = get_post_meta($id, '_fms_primary_source', true);
        if ($source) { $schema['citation'] = esc_url_raw($source); }
        if (has_post_thumbnail($id)) {
            $image = get_the_post_thumbnail_url($id, 'full');
            if ($image) { $schema['image'] = $image; }
        }
    }
    $json = wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($json) {
        echo '<script type="application/ld+json">' . $json . '</script>' . "\n";
    }
}
add_action('wp_head','fms_theme_structured_data', 9);

/** Unimportant GET-filter combinations should not become duplicate search pages. */
function fms_theme_filtered_archive_robots($robots) {
    if (!is_post_type_archive('fms_machine') && !is_post_type_archive('fms_part')) {
        return $robots;
    }
    foreach (['fms_filter_brand','fms_filter_type','fms_filter_hp_min','fms_filter_hp_max'] as $key) {
        if (isset($_GET[$key]) && is_scalar($_GET[$key]) && trim((string) $_GET[$key]) !== '') {
            $robots['noindex'] = true;
            $robots['follow'] = true;
            break;
        }
    }
    return $robots;
}
add_filter('wp_robots','fms_theme_filtered_archive_robots');


/** Source-backed part references: no fake product offers, ratings or availability. */
function fms_theme_part_reference_schema() {
    if (is_admin() || fms_theme_has_seo_plugin() || !is_singular('fms_part')) {
        return;
    }
    $id = get_queried_object_id();
    if (!$id || get_post_status($id) !== 'publish') {
        return;
    }
    $sku = get_post_meta($id, '_fms_part_number', true);
    $scope = get_post_meta($id, '_fms_serial_scope', true);
    $source = get_post_meta($id, '_fms_primary_source', true);
    $schema = [
        '@context' => 'https://schema.org',
        '@type' => 'Product',
        'name' => get_the_title($id),
        'description' => fms_theme_description(),
        'url' => get_permalink($id),
        'mainEntityOfPage' => get_permalink($id),
    ];
    if ($sku) { $schema['sku'] = (string) $sku; }
    $brands = wp_get_post_terms($id, 'fms_brand');
    if (!is_wp_error($brands) && !empty($brands)) {
        $schema['brand'] = ['@type' => 'Brand', 'name' => $brands[0]->name];
    }
    if ($scope) {
        $schema['additionalProperty'] = [
            ['@type' => 'PropertyValue',
             'name' => 'Manufacturer-listed general serial applicability (verify exact fit)',
             'value' => (string) $scope],
        ];
    }
    if ($source) {
        $schema['subjectOf'] = ['@type' => 'CreativeWork', 'url' => esc_url_raw($source)];
    }
    if (has_post_thumbnail($id)) {
        $image = get_the_post_thumbnail_url($id, 'full');
        if ($image) { $schema['image'] = $image; }
    }
    $json = wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($json) {
        echo '<script type="application/ld+json">' . $json . '</script>' . "\n";
    }
}
add_action('wp_head','fms_theme_part_reference_schema',9);


/** Breadcrumb structured data matching the visible on-page navigation. */
function fms_theme_breadcrumb_schema() {
    if (is_admin() || fms_theme_has_seo_plugin() || !is_singular(['post','fms_machine','fms_part'])) {
        return;
    }
    $id = get_queried_object_id();
    if (!$id || get_post_status($id) !== 'publish') { return; }
    $list = [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => home_url('/')],
    ];
    $type = get_post_type($id);
    if ($type === 'fms_machine') {
        $list[] = ['@type' => 'ListItem', 'position' => 2, 'name' => 'Machines', 'item' => home_url('/machines/')];
        $terms = wp_get_post_terms($id, 'fms_brand');
        if (!is_wp_error($terms) && $terms) {
            $url = get_term_link($terms[0]);
            if (!is_wp_error($url)) {
                $list[] = ['@type' => 'ListItem', 'position' => 3, 'name' => $terms[0]->name, 'item' => $url];
            }
        }
    } elseif ($type === 'fms_part') {
        $list[] = ['@type' => 'ListItem', 'position' => 2, 'name' => 'Parts references', 'item' => home_url('/parts/')];
    } else {
        $cats = get_the_category($id);
        $preferred = ['troubleshooting','maintenance','comparisons','parts-compatibility','buying-guides','guides'];
        $primary = null;
        foreach ($preferred as $slug) {
            foreach ($cats as $category) {
                if ($category->slug === $slug) { $primary = $category; break 2; }
            }
        }
        if ($primary) {
            $list[] = [
                '@type' => 'ListItem',
                'position' => 2,
                'name' => $primary->name,
                'item' => get_category_link($primary->term_id),
            ];
        } else {
            $list[] = ['@type' => 'ListItem', 'position' => 2, 'name' => 'Guides', 'item' => home_url('/category/guides/')];
        }
    }
    $list[] = [
        '@type' => 'ListItem',
        'position' => count($list) + 1,
        'name' => get_the_title($id),
        'item' => get_permalink($id),
    ];
    $json = wp_json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => $list,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($json) { echo '<script type="application/ld+json">' . $json . '</script>' . "\n"; }
}
add_action('wp_head','fms_theme_breadcrumb_schema',10);


/* Avoid indexing empty/repetitive author, attachment and date pages. */
function fms_theme_unhelpful_archives_noindex($robots) {
    if (is_author() || is_date() || is_attachment() || is_search()) {
        $robots['noindex'] = true;
        $robots['follow'] = true;
    }
    return $robots;
}
add_filter('wp_robots', 'fms_theme_unhelpful_archives_noindex');

/** Credit the original author and license for imported editorial photography. */
function fms_featured_image_credit($post_id) {
    $attachment_id = get_post_thumbnail_id((int) $post_id);
    if (!$attachment_id) { return; }
    $credit = get_post_meta($attachment_id, '_fms_credit', true);
    $license = get_post_meta($attachment_id, '_fms_license', true);
    $source = get_post_meta($attachment_id, '_fms_source_url', true);
    if (!$credit || !$license || !$source) { return; }
    echo '<p class="fms-photo-credit">Photo: ' . esc_html($credit) .
        ' · ' . esc_html($license) . ' · <a href="' .
        esc_url($source) . '" rel="license noopener noreferrer" target="_blank">Original &amp; license</a></p>';
}
