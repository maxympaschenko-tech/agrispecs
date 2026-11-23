<?php
/**
 * Public brand directory.
 * Count actual published machine/part posts rather than stale taxonomy term counts.
 */
if (!defined('ABSPATH')) { exit; }
get_header();
$brand_rows = [];
$terms = taxonomy_exists('fms_brand')
    ? get_terms(['taxonomy' => 'fms_brand', 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC'])
    : [];
if (!is_wp_error($terms) && is_array($terms)) {
    foreach ($terms as $term) {
        $url = get_term_link($term);
        if (is_wp_error($url)) { continue; }
        $counts = [];
        foreach (['fms_machine' => 'machines', 'fms_part' => 'parts'] as $post_type => $key) {
            $q = new WP_Query([
                'post_type' => $post_type,
                'post_status' => 'publish',
                'tax_query' => [[
                    'taxonomy' => 'fms_brand',
                    'field' => 'term_id',
                    'terms' => [(int) $term->term_id],
                ]],
                'posts_per_page' => 1,
                'fields' => 'ids',
                'no_found_rows' => false,
                'ignore_sticky_posts' => true,
            ]);
            $counts[$key] = (int) $q->found_posts;
            wp_reset_postdata();
        }
        if ($counts['machines'] + $counts['parts'] < 1) { continue; }
        $brand_rows[] = ['term' => $term, 'url' => $url, 'counts' => $counts];
    }
}
?>
<section class="page-heading"><div class="wrap">
  <span class="kicker">Manufacturer directory</span>
  <h1>Farm equipment brands &amp; OEM parts</h1>
  <p>Find independently researched US tractor specifications, original part references and source-specific service notes by manufacturer. A brand listing does not imply the manufacturer's endorsement.</p>
</div></section>
<section class="section"><div class="wrap">
<?php if ($brand_rows): ?>
  <div class="section-head">
    <div><h2>Browse manufacturers</h2><p>These counts reflect published models and OEM part references, not drafts or generic articles.</p></div>
  </div>
  <div class="card-grid">
  <?php foreach ($brand_rows as $row):
      $term = $row['term'];
      $counts = $row['counts'];
      $url = $row['url'];
  ?>
    <article class="data-card fms-brand-directory-card">
      <span class="kicker">Manufacturer</span>
      <h3><a href="<?php echo esc_url($url); ?>"><?php echo esc_html($term->name); ?></a></h3>
      <p>
         <strong><?php echo esc_html(number_format_i18n($counts['machines'])); ?></strong> equipment model<?php echo $counts['machines'] === 1 ? '' : 's'; ?>
         <span aria-hidden="true">·</span>
         <strong><?php echo esc_html(number_format_i18n($counts['parts'])); ?></strong> OEM part reference<?php echo $counts['parts'] === 1 ? '' : 's'; ?>
      </p>
      <a class="read-more" href="<?php echo esc_url($url); ?>">Browse this brand →</a>
    </article>
  <?php endforeach; ?>
  </div>
<?php else: ?>
  <p class="content-intro">Verified manufacturer listings will appear as machine and OEM records are published.</p>
<?php endif; ?>
<div class="tool-panel">
  <h2>Search models and part numbers</h2>
  <p>Try a brand, tractor model, original filter number or maintenance topic.</p>
  <form class="inline-search" method="get" action="<?php echo esc_url(home_url('/')); ?>" role="search">
    <label class="screen-reader-text" for="fms-brand-search">Search models and manufacturers</label>
    <input id="fms-brand-search" name="s" type="search" placeholder="e.g. WORKMASTER 25S or MIU804763" required>
    <button class="btn" type="submit">Search</button>
  </form>
</div>
</div></section>
<?php get_footer(); ?>
