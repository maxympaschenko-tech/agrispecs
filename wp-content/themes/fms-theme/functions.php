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
    wp_enqueue_style('fms-style', get_stylesheet_uri(), [], '1.0.0');
    wp_enqueue_script('fms-navigation', get_template_directory_uri().'/assets/site.js', [], '1.0.0', true);
}
add_action('wp_enqueue_scripts','fms_theme_assets');
function fms_theme_excerpt_length(){return 22;}
add_filter('excerpt_length','fms_theme_excerpt_length',999);
function fms_card($post_id) {
    $id=(int)$post_id; $type=get_post_type($id);
    echo '<article class="data-card"><span class="kicker">'.esc_html($type==='fms_machine'?'Machine specs':($type==='fms_part'?'Parts reference':'Practical guide')).'</span>';
    echo '<a href="'.esc_url(get_permalink($id)).'"><h3>'.esc_html(get_the_title($id)).'</h3></a>';
    if($type==='fms_machine') {
        $power=get_post_meta($id,'fms_engine_hp',true);
        $pto=get_post_meta($id,'fms_pto_hp',true);
        if($power!=='' || $pto!=='') {
            echo '<div class="card-meta">';
            if($power!=='') echo '<span>'.esc_html($power).' engine HP</span>';
            if($pto!=='') echo '<span>'.esc_html($pto).' PTO HP</span>';
            echo '</div>';
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
        return $term && !is_wp_error($term) ? sprintf('Explore practical %s articles and tractor equipment guidance for US farm and property owners.', $term->name) : '';
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
