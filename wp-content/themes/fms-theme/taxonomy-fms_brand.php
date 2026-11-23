<?php
/**
 * A manufacturer's editorial index with distinct equipment and OEM part lists.
 * The brand term groups published references; it never asserts OEM endorsement.
 */
if (!defined('ABSPATH')) { exit; }
$brand_term = get_queried_object();
if (!$brand_term instanceof WP_Term || $brand_term->taxonomy !== 'fms_brand') {
    get_template_part('404');
    return;
}
if ((int) get_query_var('paged') > 1) {
    wp_safe_redirect(get_term_link($brand_term), 301);
    exit;
}
$brand_id = (int) $brand_term->term_id;
$brand_name = $brand_term->name;
$tax = [
    [
        'taxonomy' => 'fms_brand',
        'field' => 'term_id',
        'terms' => [$brand_id],
    ]
];
$machines = new WP_Query([
    'post_type' => 'fms_machine',
    'post_status' => 'publish',
    'tax_query' => $tax,
    'posts_per_page' => 12,
    'no_found_rows' => false,
    'orderby' => 'title',
    'order' => 'ASC',
]);
$parts = new WP_Query([
    'post_type' => 'fms_part',
    'post_status' => 'publish',
    'tax_query' => $tax,
    'posts_per_page' => 8,
    'no_found_rows' => false,
    'orderby' => 'title',
    'order' => 'ASC',
]);
$machine_count = (int) $machines->found_posts;
$part_count = (int) $parts->found_posts;
$machines_url = add_query_arg('fms_filter_brand', $brand_term->slug, get_post_type_archive_link('fms_machine'));
$parts_url = add_query_arg('fms_filter_brand', $brand_term->slug, get_post_type_archive_link('fms_part'));
get_header();
?>
<section class="page-heading">
 <div class="wrap">
  <nav class="fms-breadcrumbs" aria-label="Breadcrumbs">
    <a href="<?php echo esc_url(home_url('/')); ?>">Home</a><span aria-hidden="true">/</span>
    <a href="<?php echo esc_url(home_url('/brands/')); ?>">Manufacturers</a>
  </nav>
  <span class="kicker">Independent manufacturer reference</span>
  <h1><?php echo esc_html($brand_name); ?> tractor specifications &amp; OEM parts</h1>
  <p>Explore source-backed <?php echo esc_html($brand_name); ?> equipment records, documented part numbers and model-specific service guidance. Check the production year, exact tractor configuration and OEM serial-range notes.</p>
  <div class="fms-brand-statline" aria-label="Catalog availability">
    <span><strong><?php echo esc_html(number_format_i18n($machine_count)); ?></strong> machine reference<?php echo $machine_count === 1 ? '' : 's'; ?></span>
    <span><strong><?php echo esc_html(number_format_i18n($part_count)); ?></strong> OEM part reference<?php echo $part_count === 1 ? '' : 's'; ?></span>
  </div>
 </div>
</section>
<?php if ($machine_count > 0): ?>
<section class="section"><div class="wrap">
 <div class="section-head">
  <div><h2><?php echo esc_html($brand_name); ?> equipment specifications</h2><p>Engine HP, PTO power, hydraulics, hitch and published equipment weight, with configuration-specific source notes.</p></div>
  <a href="<?php echo esc_url($machines_url); ?>">All <?php echo esc_html($brand_name); ?> models →</a>
 </div>
 <div class="card-grid">
 <?php while ($machines->have_posts()): $machines->the_post(); fms_card(get_the_ID()); endwhile; ?>
 </div>
 <?php wp_reset_postdata(); ?>
 <?php if ($machine_count > 12): ?><p class="fms-brand-more"><a class="btn" href="<?php echo esc_url($machines_url); ?>">See all <?php echo esc_html(number_format_i18n($machine_count)); ?> models</a></p><?php endif; ?>
 </div></section>
<?php else: wp_reset_postdata(); endif; ?>
<?php if ($part_count > 0): ?>
<section class="section section-tint"><div class="wrap">
 <div class="section-head">
  <div><h2><?php echo esc_html($brand_name); ?> OEM part numbers</h2><p>Factory part references with model-year and serial applicability limitations. An equipment-name match alone is not a fitment guarantee.</p></div>
  <a href="<?php echo esc_url($parts_url); ?>">All <?php echo esc_html($brand_name); ?> parts →</a>
 </div>
 <div class="card-grid">
 <?php while ($parts->have_posts()): $parts->the_post(); fms_card(get_the_ID()); endwhile; ?>
 </div>
 <?php wp_reset_postdata(); ?>
 <?php if ($part_count > 8): ?><p class="fms-brand-more"><a class="btn" href="<?php echo esc_url($parts_url); ?>">See all <?php echo esc_html(number_format_i18n($part_count)); ?> parts</a></p><?php endif; ?>
 </div></section>
<?php else: wp_reset_postdata(); endif; ?>
<section class="section"><div class="wrap fms-brand-followup">
 <div>
  <h2>Find the correct <?php echo esc_html($brand_name); ?> configuration</h2>
  <p>Specifications can vary by country, production year, transmission, tire size and attachments. Original part numbers and serial-specific OEM service documents take precedence over a general model listing.</p>
 </div>
 <div class="fms-brand-actions">
  <a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare documented model specs →</a>
  <a href="<?php echo esc_url(home_url('/category/maintenance/')); ?>">Maintenance &amp; service references →</a>
  <a href="<?php echo esc_url(home_url('/methodology/')); ?>">How we verify sources →</a>
 </div>
</div></section>
<?php get_footer(); ?>
