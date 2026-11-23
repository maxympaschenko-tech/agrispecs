<?php
if (!defined('ABSPATH')) { exit; }
get_header();
$brands = get_terms(['taxonomy' => 'fms_brand','hide_empty' => true,'orderby' => 'name']);
$types  = get_terms(['taxonomy' => 'fms_equipment_type','hide_empty' => true,'orderby' => 'name']);
$brand = isset($_GET['fms_filter_brand']) && is_scalar($_GET['fms_filter_brand'])
    ? sanitize_title(wp_unslash($_GET['fms_filter_brand'])) : '';
$type  = isset($_GET['fms_filter_type']) && is_scalar($_GET['fms_filter_type'])
    ? sanitize_title(wp_unslash($_GET['fms_filter_type'])) : '';
$hp_min = function_exists('fms_data_engine_hp_bound') ? fms_data_engine_hp_bound('fms_filter_hp_min') : '';
$hp_max = function_exists('fms_data_engine_hp_bound') ? fms_data_engine_hp_bound('fms_filter_hp_max') : '';
$active = array_filter([
    'fms_filter_brand' => $brand,
    'fms_filter_type' => $type,
    'fms_filter_hp_min' => $hp_min,
    'fms_filter_hp_max' => $hp_max,
], static fn($value) => $value !== '');
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
        <?php if (!is_wp_error($brands) && is_array($brands)): foreach ($brands as $term): ?>
          <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($brand, $term->slug); ?>>
            <?php echo esc_html($term->name); ?>
          </option>
        <?php endforeach; endif; ?>
      </select>
    </label>
    <label><span>Equipment type</span>
      <select name="fms_filter_type">
        <option value="">All types</option>
        <?php if (!is_wp_error($types) && is_array($types)): foreach ($types as $term): ?>
          <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($type, $term->slug); ?>>
            <?php echo esc_html($term->name); ?>
          </option>
        <?php endforeach; endif; ?>
      </select>
    </label>
    <label class="fms-hp-bound"><span>Min engine HP</span>
      <input type="number" inputmode="decimal" min="0" max="2000" step="0.1"
        name="fms_filter_hp_min" placeholder="e.g. 20" value="<?php echo esc_attr($hp_min); ?>">
    </label>
    <label class="fms-hp-bound"><span>Max engine HP</span>
      <input type="number" inputmode="decimal" min="0" max="2000" step="0.1"
        name="fms_filter_hp_max" placeholder="e.g. 40" value="<?php echo esc_attr($hp_max); ?>">
    </label>
    <button class="btn" type="submit">Apply filters</button>
    <?php if ($active): ?>
      <a href="<?php echo esc_url(get_post_type_archive_link('fms_machine')); ?>">Clear filters</a>
    <?php endif; ?>
  </form>
  <p class="fms-filters-note">The horsepower range applies to engine ratings, not PTO output. Blank manufacturer values do not match an active HP range.</p>
 </div>
</section>
<section class="wrap archive-grid">
  <div class="section-head">
    <div>
      <h2><?php echo esc_html(number_format_i18n((int) $GLOBALS['wp_query']->found_posts)); ?> matching machine records</h2>
      <p>Engine HP range uses only documented gross/rated engine figures. Check source notes for differences in rating standards and model years.</p>
    </div>
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
      'add_args' => $active]); ?>
  </div>
</section>
<?php get_footer(); ?>
