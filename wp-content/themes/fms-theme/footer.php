<?php if(!defined('ABSPATH')){exit;} ?>
</main>
<footer class="site-footer"><div class="wrap">
<div class="footer-top">
<div><a class="brand" href="<?php echo esc_url(home_url('/')); ?>"><img class="footer-brand-icon" src="<?php echo esc_url(get_template_directory_uri().'/assets/fms-favicon.svg'); ?>" alt="" width="48" height="48" decoding="async"><span>Farm Machine Specs<small>Independent equipment reference</small></span></a><p class="tagline" style="color:#c0d6c9;max-width:360px">Specs, diagnostics and parts information for US farmers, equipment owners and mechanics. Verify critical values against your exact machine's official documentation.</p></div>
<div><h3>Explore</h3><ul><li><a href="<?php echo esc_url(home_url('/machines/')); ?>">Equipment specs</a></li><li><a href="<?php echo esc_url(home_url('/category/troubleshooting/')); ?>">Troubleshooting</a></li><li><a href="<?php echo esc_url(home_url('/category/maintenance/')); ?>">Maintenance</a></li><li><a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare tractors</a></li><li><a href="<?php echo esc_url(home_url('/unit-converter/')); ?>">Unit converter</a></li></ul></div>
<div><h3>About & policies</h3><ul><?php
foreach (['methodology'=>'Data methodology','editorial-policy'=>'Editorial policy','about'=>'About us','contact'=>'Contact','privacy-policy'=>'Privacy policy'] as $slug=>$label) {
  $p=get_page_by_path($slug);
  if ($p && $p->post_status==='publish') {
    echo '<li><a href="'.esc_url(get_permalink($p)).'">'.esc_html($label).'</a></li>';
  }
}
?></ul></div>
</div><div class="copyright">© <?php echo esc_html(gmdate('Y')); ?> Farm Machine Specs · Independent reference; not affiliated with equipment manufacturers. Brand names belong to their respective owners.</div>
</div></footer><?php wp_footer(); ?></body></html>
