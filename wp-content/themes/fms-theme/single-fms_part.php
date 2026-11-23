<?php get_header();while(have_posts()){the_post(); ?>
<div class="page-heading"><div class="wrap"><span class="kicker">Equipment part reference</span><h1><?php the_title(); ?></h1><p>Identification notes and confirmed references for this farm equipment part.</p></div></div>
<div class="wrap content-layout"><article class="entry-content">
<?php if(has_post_thumbnail())the_post_thumbnail('large',['loading'=>'eager']);the_content(); ?>
<div class="notice"><strong>Parts safety:</strong> This page is an independent reference, not an OEM confirmation of interchangeability. Check manufacturer documentation, part supersession notices, serial numbers and exact fitment before ordering or installing.</div>
</article><aside class="sidebar"><div class="sidebar-box"><h3>Find more</h3><a href="<?php echo esc_url(home_url('/parts/')); ?>">All part references →</a><a href="<?php echo esc_url(home_url('/machines/')); ?>">Machines catalog →</a><a href="<?php echo esc_url(home_url('/contact/')); ?>">Report a correction →</a></div></aside></div>
<?php }get_footer(); ?>
