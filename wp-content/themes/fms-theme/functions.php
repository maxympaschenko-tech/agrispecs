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
