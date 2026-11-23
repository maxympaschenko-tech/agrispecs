<?php if(!defined('ABSPATH')){exit;} ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class(); ?>><?php wp_body_open(); ?>
<a class="skip" href="#main-content">Skip to content</a>
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="Farm Machine Specs home"><span class="brand-mark" aria-hidden="true">⚙</span><span>Farm Machine Specs<small>Repair · Compare · Maintain</small></span></a>
<button class="nav-toggle" type="button" aria-controls="fms-menu" aria-expanded="false">☰ Menu</button>
<nav class="main-nav" id="fms-menu" aria-label="Main navigation">
<?php
if(has_nav_menu('primary')) { wp_nav_menu(['theme_location'=>'primary','container'=>false,'menu_class'=>'main-menu','depth'=>1]); }
else { echo '<ul class="main-menu"><li><a href="'.esc_url(home_url('/machines/')).'">Machines</a></li><li><a href="'.esc_url(home_url('/brands/')).'">Brands</a></li><li><a href="'.esc_url(home_url('/category/troubleshooting/')).'">Troubleshooting</a></li><li><a href="'.esc_url(home_url('/category/maintenance/')).'">Maintenance</a></li><li><a href="'.esc_url(home_url('/compare/')).'">Compare</a></li></ul>'; }
?>
</nav><a class="header-cta" href="<?php echo esc_url(home_url('/compare/')); ?>">Compare models</a></div></header>
<main id="main-content">
