<?php
if (!defined('ABSPATH')) { exit; }
get_header();
while (have_posts()) {
    the_post();
    $id = get_the_ID();
    $part_number = get_post_meta($id, '_fms_part_number', true);
    $serial_scope = get_post_meta($id, '_fms_serial_scope', true);
    $primary_source = get_post_meta($id, '_fms_primary_source', true);
?>
<div class="page-heading"><div class="wrap">
    <nav class="fms-breadcrumbs" aria-label="Breadcrumbs">
        <a href="<?php echo esc_url(home_url('/')); ?>">Home</a> <span aria-hidden="true">/</span>
        <a href="<?php echo esc_url(home_url('/parts/')); ?>">Parts references</a>
    </nav>
    <span class="kicker">OEM part number &amp; serial applicability</span>
    <h1><?php the_title(); ?></h1>
    <p>Verify exact machine serial numbers and current OEM supersession before ordering replacement parts.</p>
</div></div>
<div class="wrap content-layout">
    <article class="entry-content">
        <?php if (has_post_thumbnail()) { the_post_thumbnail('large', ['loading' => 'eager']); } ?>
        <?php if ($part_number || $serial_scope) : ?>
        <div class="fms-part-facts">
            <?php if ($part_number) : ?>
                <div><strong>OEM reference</strong><span><?php echo esc_html($part_number); ?></span></div>
            <?php endif; ?>
            <?php if ($serial_scope) : ?>
                <div><strong>Serial number / applicability</strong><span><?php echo esc_html($serial_scope); ?></span></div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        <?php the_content(); ?>
        <div class="notice"><strong>Compatibility warning:</strong> Manufacturer listings described as generally compatible are not guaranteed fits. Confirm current part supersession, model configuration, serial range and service requirements through the original equipment manufacturer before purchase or installation.</div>
        <?php if ($primary_source) : ?>
          <section class="sources"><h2>Original OEM reference</h2>
            <p><a href="<?php echo esc_url($primary_source); ?>" target="_blank" rel="noopener noreferrer">View the manufacturer's original part listing →</a></p>
          </section>
        <?php endif; ?>
    </article>
    <aside class="sidebar">
        <div class="sidebar-box"><h3>Find more</h3>
          <a href="<?php echo esc_url(home_url('/parts/')); ?>">Parts reference catalog →</a>
          <a href="<?php echo esc_url(home_url('/machines/')); ?>">Machine specifications →</a>
          <a href="<?php echo esc_url(home_url('/category/maintenance/')); ?>">Maintenance guides →</a>
        </div>
    </aside>
</div>
<?php }
get_footer();
