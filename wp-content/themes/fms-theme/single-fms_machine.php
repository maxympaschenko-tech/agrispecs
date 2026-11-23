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
        <?php
        // Show the source-edition distinction instead of silently overwriting
        // previously imported, potentially edited WordPress specifications.
        $fms_model_slug = get_post_field('post_name', $id);
        if ($fms_model_slug === 'kubota-l2502-hst') : ?>
        <aside class="fms-edition-note" aria-label="Important manufacturer brochure revision">
          <h2>Check the Kubota specification edition</h2>
          <p>This reference records the earlier Kubota US L02 sheet (24.8 gross hp and 19.0 HST PTO hp). Kubota's <strong>2026 Full Line Brochure</strong> lists 23.3 gross hp and 18.4 HST PTO hp for its L2502 table. These two document editions should not be mixed when choosing implements. Match the correct tractor serial and year.</p>
          <p><a href="<?php echo esc_url(home_url('/kubota-l2502-24-8-vs-23-3-hp-brochure-differences/')); ?>">See both official brochure editions and verification steps →</a></p>
        </aside>
        <?php elseif (in_array($fms_model_slug, ['kubota-l3302-hst','kubota-l3902-hst'], true)) : ?>
        <aside class="fms-edition-note" aria-label="Manufacturer brochure edition notice">
          <h2>Manufacturer edition matters</h2>
          <p>This page cites a particular Kubota L02 specification edition. The Kubota <strong>2026 Full Line Brochure</strong> gives a 2,778-lb HST tractor weight and a 1,435-lb 24-inch-behind hitch rating for the relevant L3302/L3902 configurations, different from some figures in the cited source on this page. Do not merge ratings from different publications without confirming the tractor's exact configuration.</p>
          <p><a href="<?php echo esc_url(home_url('/kubota-l3302-l3902-dt-vs-hst-2026/')); ?>">Compare the 2026 manufacturer figures →</a></p>
        </aside>
        <?php endif; ?>
        <?php if (function_exists('fms_render_specs')) { fms_render_specs($id); } ?>
        <div class="notice"><strong>Safety:</strong> Check your machine's exact serial range and factory manual before lifting loads, selecting replacement parts or servicing hydraulic and PTO systems.</div>
        <?php if (function_exists('fms_render_source')) { fms_render_source($id); } ?>
        <?php
        /* Hand-reviewed internal links, not fuzzy keyword matching. */
        $fms_owner_guides = [
            'john-deere-1025r' => [
                'john-deere-1025r-200-hour-service-filters-oil-checklist',
                'john-deere-1025r-air-filter-serial-numbers-m131802-lvu34503',
                'john-deere-1025r-air-filter-restriction-indicator-red',
                'john-deere-1025r-fluid-capacities-engine-transmission-hydraulic',
                'john-deere-1025r-filter-kits-serial-number-lva21036-vs-ta25769',
                'john-deere-1m-25-vs-1025r-tractor-comparison',
            ],
            'john-deere-1m-25' => [
                'john-deere-1m-25-vs-1025r-tractor-comparison',
                'used-compact-tractor-inspection-checklist-before-buying',
            ],
            'john-deere-5050e' => [
                'tractor-hydraulic-flow-gpm-pump-vs-implement-circuit',
                'used-compact-tractor-inspection-checklist-before-buying',
            ],
            'john-deere-3025e' => [
                'john-deere-3025e-vs-3032e-specs-2026-pto-hydraulics-hitch',
                'john-deere-300e-loader-lift-capacity-pivot-vs-500mm',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'tractor-hydraulic-flow-gpm-pump-vs-implement-circuit',
                'used-compact-tractor-inspection-checklist-before-buying',
            ],
            'john-deere-3032e' => [
                'john-deere-3025e-vs-3032e-specs-2026-pto-hydraulics-hitch',
                'john-deere-300e-loader-lift-capacity-pivot-vs-500mm',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'tractor-hydraulic-flow-gpm-pump-vs-implement-circuit',
                'used-compact-tractor-inspection-checklist-before-buying',
            ],
            'kubota-l2502-hst' => [
                'kubota-l2502-24-8-vs-23-3-hp-brochure-differences',
                'kubota-la526-loader-lift-capacity-height-comparison',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
            ],
            'kubota-l3302-dt-2026' => [
                'kubota-l3302-l3902-dt-vs-hst-2026',
                'kubota-la526-loader-lift-capacity-height-comparison',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
            'kubota-l3902-dt-2026' => [
                'kubota-l3302-l3902-dt-vs-hst-2026',
                'kubota-la526-loader-lift-capacity-height-comparison',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
            'kubota-bx2380' => [
                'kubota-bx2380-wont-crank-starter-neutral-pto-battery',
                'kubota-bx2380-engine-stalls-when-standing-or-pto-engaged',
                'kubota-bx80-50-hour-maintenance-grease-safety-checks',
                'kubota-bx2380-fluid-capacities-engine-oil-coolant-transmission',
                'kubota-bx1880-vs-bx2380-vs-bx2680-comparison',
                'kubota-bx90-vs-bx80-2027-models-specifications',
            ],
            'kubota-bx1880' => [
                'kubota-bx2380-wont-crank-starter-neutral-pto-battery',
                'kubota-bx2380-engine-stalls-when-standing-or-pto-engaged',
                'kubota-bx80-50-hour-maintenance-grease-safety-checks',
                'kubota-bx1880-vs-bx2380-vs-bx2680-comparison',
                'kubota-bx90-vs-bx80-2027-models-specifications',
            ],
            'kubota-bx2680' => [
                'kubota-bx2380-wont-crank-starter-neutral-pto-battery',
                'kubota-bx2380-engine-stalls-when-standing-or-pto-engaged',
                'kubota-bx80-50-hour-maintenance-grease-safety-checks',
                'kubota-bx1880-vs-bx2380-vs-bx2680-comparison',
                'kubota-bx90-vs-bx80-2027-models-specifications',
            ],
            'kioti-ck2620' => ['kioti-ck2620-vs-ck2620h-gear-vs-hst-tractor'],
            'kioti-ck2620h' => ['kioti-ck2620-vs-ck2620h-gear-vs-hst-tractor'],
            'kioti-ck3520' => [
                'kioti-ck3520-vs-ck3520h-manual-vs-hst',
                'tractor-hydraulic-flow-gpm-pump-vs-implement-circuit',
            ],
            'kioti-ck3520h' => [
                'kioti-ck3520-vs-ck3520h-manual-vs-hst',
                'tractor-hydraulic-flow-gpm-pump-vs-implement-circuit',
            ],
            'massey-ferguson-gc1723e' => [
                'massey-ferguson-gc1723e-vs-gc1725m-specifications',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
            'massey-ferguson-gc1725m' => [
                'massey-ferguson-gc1723e-vs-gc1725m-specifications',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
            'kubota-l3302-hst' => [
                'kubota-l3302-l3902-dt-vs-hst-2026',
                'kubota-la526-loader-lift-capacity-height-comparison',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'kubota-l3302-vs-l3902-hst-tractor-spec-comparison',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
            'kubota-l3902-hst' => [
                'kubota-l3302-l3902-dt-vs-hst-2026',
                'kubota-la526-loader-lift-capacity-height-comparison',
                'john-deere-300e-vs-kubota-la526-loader-capacity',
                'kubota-l3302-vs-l3902-hst-tractor-spec-comparison',
                'tractor-3-point-hitch-lift-capacity-at-lift-points-vs-24-inches',
            ],
        ];
        $fms_slugs = $fms_owner_guides[get_post_field('post_name', $id)] ?? [];
        if ($fms_slugs) {
            $fms_guide_query = new WP_Query([
                'post_type' => 'post', 'post_status' => 'publish',
                'post_name__in' => $fms_slugs, 'orderby' => 'post_name__in',
                'posts_per_page' => count($fms_slugs), 'no_found_rows' => true,
            ]);
            if ($fms_guide_query->have_posts()) {
                echo '<section class="fms-related-guides"><h2>Service, parts &amp; ownership guides</h2><div class="card-grid">';
                while ($fms_guide_query->have_posts()) {
                    $fms_guide_query->the_post();
                    fms_card(get_the_ID());
                }
                echo '</div></section>';
                wp_reset_postdata();
            }
        }
        /* Explicit family references; never infer compatibility from model-name similarity. */
        $fms_owner_part_slugs = [
            'john-deere-1025r' => [
                'john-deere-lva21036-filter-pak-1025r',
                'john-deere-ta25769-filter-pak-1025r',
                'john-deere-m806418-engine-oil-filter-1025r',
                'john-deere-lva16054-hydraulic-oil-filter-1025r',
                'john-deere-m131802-primary-air-filter-1025r-early-serial',
                'john-deere-lvu34503-primary-air-filter-1025r-late-serial',
                'john-deere-at25983-air-restriction-indicator-1025r',
            ],
            'john-deere-3025e' => [
                'john-deere-bxx10240-third-function-valve-3e-my22',
                'john-deere-bxx10808-third-function-valve-3e-my23',
            ],
            'john-deere-3032e' => [
                'john-deere-bxx10240-third-function-valve-3e-my22',
                'john-deere-bxx10808-third-function-valve-3e-my23',
            ],
        ];
        $fms_part_slugs = $fms_owner_part_slugs[get_post_field('post_name', $id)] ?? [];
        if ($fms_part_slugs) {
            $fms_parts = new WP_Query([
                'post_type' => 'fms_part',
                'post_status' => 'publish',
                'post_name__in' => $fms_part_slugs,
                'orderby' => 'post_name__in',
                'posts_per_page' => count($fms_part_slugs),
                'no_found_rows' => true,
            ]);
            if ($fms_parts->have_posts()) {
                echo '<section class="fms-related-guides"><h2>OEM parts &amp; serial-year references</h2>';
                echo '<p class="tagline">General manufacturer-listed applicability only. Verify actual machine serial, year, installed options and current part supersession before purchase.</p><div class="card-grid">';
                while ($fms_parts->have_posts()) {
                    $fms_parts->the_post();
                    fms_card(get_the_ID());
                }
                echo '</div></section>';
                wp_reset_postdata();
            }
        }
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
