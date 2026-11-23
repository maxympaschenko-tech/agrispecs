<?php
if (!defined('ABSPATH')) { exit; }
get_header();
while (have_posts()) {
    the_post();
    $id = get_the_ID();
    $brand_terms = wp_get_post_terms($id, 'fms_brand');
    $brand = (!is_wp_error($brand_terms) && !empty($brand_terms)) ? $brand_terms[0] : null;
?>
<div class="page-heading"><div class="wrap">
    <nav class="fms-breadcrumbs" aria-label="Breadcrumbs">
        <a href="<?php echo esc_url(home_url('/')); ?>">Home</a><span aria-hidden="true">/</span>
        <a href="<?php echo esc_url(home_url('/machines/')); ?>">Machines</a>
        <?php if ($brand && !is_wp_error(get_term_link($brand))) : ?>
            <span aria-hidden="true">/</span><a href="<?php echo esc_url(get_term_link($brand)); ?>"><?php echo esc_html($brand->name); ?></a>
        <?php endif; ?>
    </nav>
    <span class="kicker">Source-backed equipment specifications</span>
    <h1><?php the_title(); ?></h1>
    <p>Check the transmission, model year and equipment variant before comparing ratings or buying attachments.</p>
</div></div>
<div class="wrap content-layout">
    <article class="entry-content">
        <?php if (has_post_thumbnail()) { the_post_thumbnail('large',['loading'=>'eager']); } ?>
        <?php the_content(); ?>
        <?php if (function_exists('fms_render_specs')) { fms_render_specs($id); } ?>
        <div class="notice"><strong>Safety:</strong> Check your machine's exact serial range and factory manual before lifting loads, selecting replacement parts or servicing hydraulic and PTO systems.</div>
        <?php if (function_exists('fms_render_source')) { fms_render_source($id); } ?>
        <?php
        $related_args = [
            'post_type' => 'fms_machine',
            'post_status' => 'publish',
            'post__not_in' => [$id],
            'posts_per_page' => 3,
            'no_found_rows' => true,
        ];
        if ($brand) {
            $related_args['tax_query'] = [[
                'taxonomy' => 'fms_brand',
                'field' => 'term_id',
                'terms' => [$brand->term_id],
            ]];
        }
        $related = new WP_Query($related_args);
        if ($related->have_posts()) : ?>
        <section class="fms-related-machines">
            <h2>More machines to compare</h2>
            <div class="card-grid">
            <?php while ($related->have_posts()) { $related->the_post(); fms_card(get_the_ID()); } wp_reset_postdata(); ?>
            </div>
        </section>
        <?php endif; ?>
    </article>
    <aside class="sidebar">
        <div class="sidebar-box">
            <h3>Compare before you buy</h3>
            <p class="tagline">Keep this machine selected and choose a second model to compare engine power, PTO, hitch and source notes.</p>
            <a class="btn" style="color:#fff;text-align:center" href="<?php echo esc_url(add_query_arg('machine_a', $id, home_url('/compare/'))); ?>">Compare this model →</a>
        </div>
        <div class="sidebar-box"><h3>Explore more</h3>
            <?php if ($brand && !is_wp_error(get_term_link($brand))) : ?>
                <a href="<?php echo esc_url(get_term_link($brand)); ?>"><?php echo esc_html($brand->name); ?> model directory →</a>
            <?php endif; ?>
            <a href="<?php echo esc_url(home_url('/category/maintenance/')); ?>">Maintenance guides →</a>
            <a href="<?php echo esc_url(home_url('/category/troubleshooting/')); ?>">Troubleshooting →</a>
            <a href="<?php echo esc_url(home_url('/parts/')); ?>">Parts reference →</a>
        </div>
    </aside>
</div>
<?php
}
get_footer();
