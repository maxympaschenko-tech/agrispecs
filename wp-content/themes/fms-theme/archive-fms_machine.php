<?php
if (!defined('ABSPATH')) { exit; }
get_header();
$brands = get_terms(['taxonomy' => 'fms_brand','hide_empty' => true,'orderby' => 'name']);
$types  = get_terms(['taxonomy' => 'fms_equipment_type','hide_empty' => true,'orderby' => 'name']);
$brand = isset($_GET['fms_filter_brand']) && is_scalar($_GET['fms_filter_brand'])
    ? sanitize_title(wp_unslash($_GET['fms_filter_brand'])) : '';
$type  = isset($_GET['fms_filter_type']) && is_scalar($_GET['fms_filter_type'])
    ? sanitize_title(wp_unslash($_GET['fms_filter_type'])) : '';
?>
<section class="page-heading"><div class="wrap">
  <span class="kicker">Independent machinery reference</span>
  <h1>Farm equipment specifications</h1>
  <p>Find source-checked engine, PTO, hitch and hydraulic specifications. Compare the exact transmission and model configuration.</p>
  <form class="inline-search" method="get" action="<?php echo esc_url(home_url('/')); ?>" role="search">
    <label class="screen-reader-text" for="machine-search">Search equipment</label>
    <input id="machine-search" name="s" type="search" placeholder="e.g. Kioti CK2620H" required>
    <input type="hidden" name="post_type" value="fms_machine">
    <button class="btn" type="submit">Find model</button>
  </form>
</div></section>
<section class="section section-tint" style="padding:28px 0">
 <div class="wrap">
  <form class="fms-model-filters" method="get" action="<?php echo esc_url(get_post_type_archive_link('fms_machine')); ?>">
    <label><span>Manufacturer</span>
      <select name="fms_filter_brand">
        <option value="">All brands</option>
        <?php if (!is_wp_error($brands)) foreach ($brands as $term): ?>
          <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($brand, $term->slug); ?>>
            <?php echo esc_html($term->name); ?>
          </option>
        <?php endforeach; ?>
      </select>
    </label>
    <label><span>Equipment type</span>
      <select name="fms_filter_type">
        <option value="">All types</option>
        <?php if (!is_wp_error($types)) foreach ($types as $term): ?>
          <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($type, $term->slug); ?>>
            <?php echo esc_html($term->name); ?>
          </option>
        <?php endforeach; ?>
      </select>
    </label>
    <button class="btn" type="submit">Apply filters</button>
    <?php if ($brand !== '' || $type !== ''): ?>
      <a href="<?php echo esc_url(get_post_type_archive_link('fms_machine')); ?>">Clear filters</a>
    <?php endif; ?>
  </form>
 </div>
</section>
<section class="wrap archive-grid">
  <div class="section-head">
    <div><h2>Published machine records</h2><p>Specifications are marked as not verified when the original source does not provide a comparable value.</p></div>
    <a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare two machines →</a>
  </div>
  <div class="card-grid">
    <?php if (have_posts()) : while (have_posts()) : the_post(); fms_card(get_the_ID()); endwhile;
    else : ?>
      <p>No matching published models. Clear the filters or try a different manufacturer.</p>
    <?php endif; ?>
  </div>
  <div class="pagination">
    <?php the_posts_pagination(['mid_size' => 2,
      'add_args' => array_filter(['fms_filter_brand' => $brand, 'fms_filter_type' => $type])]); ?>
  </div>
</section>
<?php get_footer(); ?>
