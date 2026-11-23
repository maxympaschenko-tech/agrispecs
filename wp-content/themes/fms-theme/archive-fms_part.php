<?php
/**
 * OEM part numbers are reference records, not a universal interchange catalog.
 */
if (!defined('ABSPATH')) { exit; }
get_header();
$brands = get_terms(['taxonomy'=>'fms_brand','hide_empty'=>true,'orderby'=>'name']);
$active_brand = isset($_GET['fms_filter_brand']) && is_scalar($_GET['fms_filter_brand'])
    ? sanitize_title(wp_unslash($_GET['fms_filter_brand'])) : '';
?>
<section class="page-heading">
 <div class="wrap">
   <span class="kicker">Manufacturer sourced • Serial-aware</span>
   <h1>OEM Farm Equipment Parts Reference</h1>
   <p>Look up original equipment part numbers, filter kits and documented model-year restrictions. These references help identify parts; they are not a guarantee of fit for a specific serial number.</p>
   <form class="inline-search" action="<?php echo esc_url(home_url('/')); ?>" method="get" role="search">
     <label class="screen-reader-text" for="fms-part-search">Search OEM number or part description</label>
     <input id="fms-part-search" type="search" name="s" placeholder="Search: M806418, filter kit, hydraulic valve..." required>
     <input type="hidden" name="post_type" value="fms_part">
     <button class="btn" type="submit">Find OEM part</button>
   </form>
 </div>
</section>
<section class="section section-tint fms-parts-filter-band">
 <div class="wrap">
    <form class="fms-model-filters" action="<?php echo esc_url(get_post_type_archive_link('fms_part')); ?>" method="get">
      <label>
       <span>Manufacturer</span>
       <select name="fms_filter_brand">
        <option value="">All manufacturers</option>
        <?php if (is_array($brands) && !is_wp_error($brands)) :
          foreach ($brands as $term): ?>
          <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($active_brand, $term->slug); ?>><?php echo esc_html($term->name); ?></option>
        <?php endforeach; endif; ?>
       </select>
      </label>
      <button type="submit" class="btn">Filter references</button>
      <?php if ($active_brand !== ''): ?>
       <a href="<?php echo esc_url(get_post_type_archive_link('fms_part')); ?>">Clear filter</a>
      <?php endif; ?>
    </form>
 </div>
</section>
<section class="wrap fms-parts-intro">
 <div>
   <h2>How to use an OEM number safely</h2>
   <p><strong>Record the complete model and serial number first.</strong> A single tractor model can use different filter, loader or hydraulic part numbers across production ranges. Confirm any current supersession in the official manufacturer catalog, especially before installing a safety-critical component.</p>
 </div>
 <nav aria-label="Useful parts research" class="fms-parts-shortcuts">
   <a href="<?php echo esc_url(home_url('/john-deere-1025r-filter-kits-serial-number-lva21036-vs-ta25769/')); ?>">1025R filter kit serial ranges →</a>
   <a href="<?php echo esc_url(home_url('/john-deere-1025r-air-filter-serial-numbers-m131802-lvu34503/')); ?>">Primary vs secondary air filters →</a>
   <a href="<?php echo esc_url(home_url('/category/parts-compatibility/')); ?>">More fitment guides →</a>
 </nav>
</section>
<section class="wrap archive-grid fms-parts-results">
 <div class="section-head">
   <div>
    <h2><?php echo esc_html(number_format_i18n((int) $GLOBALS['wp_query']->found_posts)); ?> published part references</h2>
    <p>Original part numbers, not aftermarket equivalence claims. Confirm the manufacturer and machine's complete PIN.</p>
   </div>
 </div>
 <div class="card-grid">
 <?php if (have_posts()) :
  while(have_posts()): the_post(); fms_card(get_the_ID()); endwhile;
 else: ?>
   <div class="fms-empty-search">
      <h3>No matching parts in this catalog yet</h3>
      <p>Try a part number search or clear the manufacturer filter. If you have a service manual, check the number in the original equipment maker's current parts catalog.</p>
   </div>
 <?php endif; ?>
 </div>
 <div class="pagination">
 <?php the_posts_pagination([
   'mid_size'=>2,
   'add_args'=> $active_brand !== '' ? ['fms_filter_brand'=>$active_brand] : [],
 ]); ?>
 </div>
</section>
<?php get_footer(); ?>
