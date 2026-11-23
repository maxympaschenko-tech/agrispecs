<?php get_header(); while(have_posts()){the_post(); $id=get_the_ID(); ?>
<div class="page-heading"><div class="wrap"><span class="kicker">Equipment data & specifications</span><h1><?php the_title(); ?> — Specs, Capacity & Service References</h1><p>For comparison and identification. Specifications can differ by production year and configuration.</p></div></div>
<div class="wrap content-layout"><article class="entry-content">
<?php if(has_post_thumbnail()){the_post_thumbnail('large',['loading'=>'eager']);} ?>
<?php the_content(); ?>
<?php if(function_exists('fms_render_specs')) {fms_render_specs($id);} else {echo '<p>Install and activate the FMS Equipment Data plugin to show technical specifications.</p>';} ?>
<div class="notice"><strong>Important:</strong> Confirm your exact model, serial range and factory manual before selecting replacement parts, adjusting hydraulics, lifting loads or performing safety-critical service.</div>
<?php if(function_exists('fms_render_source')){fms_render_source($id);} ?>
</article><aside class="sidebar"><div class="sidebar-box"><h3>Explore more</h3><a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare two machines →</a><a href="<?php echo esc_url(home_url('/category/maintenance/')); ?>">Maintenance guides →</a><a href="<?php echo esc_url(home_url('/category/troubleshooting/')); ?>">Troubleshooting →</a><a href="<?php echo esc_url(home_url('/parts/')); ?>">Parts reference →</a></div></aside></div>
<?php } get_footer(); ?>
