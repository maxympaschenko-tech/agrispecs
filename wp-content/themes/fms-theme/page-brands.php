<?php
if (!defined('ABSPATH')) { exit; }
get_header();
?>
<section class="page-heading"><div class="wrap">
  <span class="kicker">Manufacturer directory</span>
  <h1>Farm equipment brands</h1>
  <p>Explore tractor specifications by manufacturer, then compare models using verified source data.</p>
</div></section>
<section class="section"><div class="wrap">
<?php
$brands = taxonomy_exists('fms_brand')
    ? get_terms(['taxonomy' => 'fms_brand', 'hide_empty' => true, 'orderby' => 'name', 'order' => 'ASC'])
    : [];
if (!is_wp_error($brands) && !empty($brands)) :
?>
  <div class="section-head"><div><h2>Browse manufacturers</h2><p>Only manufacturers with published equipment records appear below.</p></div></div>
  <div class="card-grid">
  <?php foreach ($brands as $brand) :
      $url = get_term_link($brand);
      if (is_wp_error($url)) { continue; }
  ?>
    <article class="data-card"><span class="kicker">Manufacturer</span>
      <a href="<?php echo esc_url($url); ?>"><h3><?php echo esc_html($brand->name); ?></h3></a>
      <p><?php echo esc_html(number_format_i18n($brand->count)); ?> published reference records</p>
      <a class="read-more" href="<?php echo esc_url($url); ?>">Browse this brand →</a>
    </article>
  <?php endforeach; ?>
  </div>
<?php else : ?>
  <p class="content-intro">Manufacturer listings will appear as technical records are verified and published.</p>
<?php endif; ?>
<div class="tool-panel">
  <h2>Search for a model</h2>
  <p>Try a manufacturer, model number or maintenance topic.</p>
  <form class="inline-search" method="get" action="<?php echo esc_url(home_url('/')); ?>" role="search">
    <label class="screen-reader-text" for="fms-brand-search">Search models and brands</label>
    <input id="fms-brand-search" name="s" type="search" placeholder="e.g. Kubota BX2380" required>
    <button class="btn" type="submit">Search</button>
  </form>
</div>
</div></section>
<?php get_footer(); ?>
