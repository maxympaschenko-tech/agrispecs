<?php
if (!defined('ABSPATH')) { exit; }
get_header();
$search_term = get_search_query();
$type = isset($_GET['post_type']) && is_scalar($_GET['post_type'])
    ? sanitize_key(wp_unslash($_GET['post_type'])) : '';
if (!in_array($type, ['fms_machine','fms_part','post'], true)) {
    $type = '';
}
$types = ['' => 'All content', 'fms_machine' => 'Tractor & machine specs',
          'fms_part' => 'Parts & OEM numbers','post' => 'Guides & troubleshooting'];
?>
<section class="page-heading"><div class="wrap">
  <span class="kicker">Search equipment knowledge</span>
  <h1>Find a tractor, part or practical answer</h1>
  <?php if ($search_term !== ''): ?>
   <p>Results for “<?php echo esc_html($search_term); ?>”</p>
  <?php else: ?>
   <p>Search for an exact model, OEM number or maintenance problem.</p>
  <?php endif; ?>
  <form class="fms-search-filters" method="get" action="<?php echo esc_url(home_url('/')); ?>" role="search">
    <label><span>Model, part number or question</span>
      <input type="search" name="s" value="<?php echo esc_attr($search_term); ?>"
      placeholder="e.g. Kubota BX2380 oil capacity" required>
    </label>
    <label><span>Search in</span>
      <select name="post_type">
        <?php foreach ($types as $key => $label): ?>
         <option value="<?php echo esc_attr($key); ?>" <?php selected($type, $key); ?>><?php echo esc_html($label); ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <button type="submit" class="btn">Find results</button>
  </form>
</div></section>
<section class="wrap archive-grid fms-search-results">
 <div class="section-head">
  <div><h2><?php echo esc_html(number_format_i18n((int) $GLOBALS['wp_query']->found_posts)); ?> matching results</h2>
  <p>Technical figures are based on identifiable manufacturer references. Check each model and source date.</p></div>
 </div>
 <?php if (have_posts()): ?>
 <div class="card-grid">
  <?php while (have_posts()): the_post(); fms_card(get_the_ID()); endwhile; ?>
 </div>
 <div class="pagination">
  <?php the_posts_pagination(['mid_size' => 2, 'add_args' => $type ? ['post_type' => $type] : []]); ?>
 </div>
 <?php else: ?>
  <div class="fms-empty-search">
    <h2>Nothing matched that search</h2>
    <p>Try fewer words or just the manufacturer's model number. Part numbers are usually easier to identify without spaces or extra marketing terms.</p>
    <p><a href="<?php echo esc_url(home_url('/machines/')); ?>">Browse machines →</a> &nbsp; <a href="<?php echo esc_url(home_url('/parts/')); ?>">Browse parts →</a> &nbsp; <a href="<?php echo esc_url(home_url('/category/troubleshooting/')); ?>">Troubleshooting guides →</a></p>
  </div>
 <?php endif; ?>
</section>
<?php get_footer(); ?>
