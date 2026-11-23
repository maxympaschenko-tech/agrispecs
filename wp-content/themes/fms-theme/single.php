<?php
if (!defined('ABSPATH')) { exit; }
get_header();
while (have_posts()) {
    the_post();
    $id = get_the_ID();
    $cats = get_the_category($id);
    $preferred = ['troubleshooting','maintenance','comparisons','parts-compatibility','buying-guides','guides'];
    $primary = null;
    foreach ($preferred as $slug) {
        foreach ($cats as $cat) {
            if ($cat->slug === $slug) { $primary = $cat; break 2; }
        }
    }
?>
<section class="page-heading"><div class="wrap">
    <nav class="fms-breadcrumbs" aria-label="Breadcrumbs">
       <a href="<?php echo esc_url(home_url('/')); ?>">Home</a><span aria-hidden="true">/</span>
       <?php if ($primary) : ?>
          <a href="<?php echo esc_url(get_category_link($primary->term_id)); ?>"><?php echo esc_html($primary->name); ?></a>
       <?php else : ?>
          <a href="<?php echo esc_url(home_url('/category/guides/')); ?>">Guides</a>
       <?php endif; ?>
    </nav>
    <span class="kicker"><?php echo esc_html($primary ? $primary->name : 'Farm equipment guide'); ?></span>
    <h1><?php the_title(); ?></h1>
    <?php if (has_excerpt()) { echo '<p>' . esc_html(get_the_excerpt()) . '</p>'; } ?>
</div></section>
<div class="wrap content-layout">
    <article class="entry-content">
        <?php if (has_post_thumbnail()) { the_post_thumbnail('large', ['loading' => 'eager']); } ?>
        <?php
        $fms_slug = get_post_field('post_name', $id);
        // These existing articles cite Kubota's BX1880-AU / BX2380-AU /
        // BX2680-AU operator manual. Disclose region differences explicitly
        // rather than representing that edition as a US serial-specific manual.
        if (in_array($fms_slug, [
            'kubota-bx2380-wont-crank-starter-neutral-pto-battery',
            'kubota-bx2380-engine-stalls-when-standing-or-pto-engaged',
            'kubota-bx80-50-hour-maintenance-grease-safety-checks',
            'kubota-bx80-100-hour-service-battery-air-filter-fuel',
            'kubota-bx80-200-hour-oil-filter-hst-maintenance',
        ], true)) {
            echo '<aside class="fms-edition-note" aria-label="Source publication edition">'
              . '<h2>Check your U.S. manual and serial number</h2>'
              . '<p>The detailed BX80 operator manual discussed here is labeled BX1880-AU / BX2380-AU / BX2680-AU (Australian edition). Kubota offers BX80 maintenance information for U.S. owners, but equipment configurations and maintenance schedules can differ by region or production revision. Do not apply an AU-only service interval, fluid specification, electrical test or PTO instruction to a U.S. tractor without checking its correct manual.</p>'
              . '<p><a href="https://www.kubotausa.com/equipment-series/bx-series" target="_blank" rel="noopener noreferrer">View Kubota USA BX80 owner information →</a></p>'
              . '</aside>';
        }
        the_content();
        if ($fms_slug === 'john-deere-1025r-filter-kits-serial-number-lva21036-vs-ta25769'
            && shortcode_exists('fms_1025r_filter_kit_checker')) {
            echo do_shortcode('[fms_1025r_filter_kit_checker]');
        }
        if ($fms_slug === 'john-deere-1025r-200-hour-service-filters-oil-checklist'
            && shortcode_exists('fms_service_hour_planner')) {
            echo do_shortcode('[fms_service_hour_planner]');
        }
        ?>
        <div class="notice"><strong>Safety & source note:</strong> Confirm the exact model, equipment configuration and current manufacturer manual before repairing, servicing or installing attachments.</div>
        <?php
        if ($primary) {
            $related = new WP_Query([
                'post_type' => 'post',
                'post_status' => 'publish',
                'category__in' => [(int) $primary->term_id],
                'post__not_in' => [$id],
                'posts_per_page' => 3,
                'no_found_rows' => true,
            ]);
            if ($related->have_posts()) {
                echo '<section class="fms-related-guides"><h2>Related guides & references</h2><div class="card-grid">';
                while ($related->have_posts()) {
                    $related->the_post();
                    fms_card(get_the_ID());
                }
                echo '</div></section>';
                wp_reset_postdata();
            }
        }
        ?>
    </article>
    <aside class="sidebar">
      <div class="sidebar-box"><h3>Explore equipment</h3>
         <a href="<?php echo esc_url(home_url('/machines/')); ?>">Machine specifications →</a>
         <a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare models →</a>
         <a href="<?php echo esc_url(home_url('/parts/')); ?>">OEM parts references →</a>
         <a href="<?php echo esc_url(home_url('/methodology/')); ?>">Source methodology →</a>
      </div>
      <?php if ($primary): ?>
      <div class="sidebar-box"><h3>More in this topic</h3>
        <a href="<?php echo esc_url(get_category_link($primary->term_id)); ?>"><?php echo esc_html($primary->name); ?> articles →</a>
      </div>
      <?php endif; ?>
    </aside>
</div>
<?php }
get_footer();
