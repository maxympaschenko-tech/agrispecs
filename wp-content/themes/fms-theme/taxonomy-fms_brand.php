<?php get_header();$term=get_queried_object(); ?>
<div class="page-heading"><div class="wrap"><span class="kicker">Machine manufacturer</span><h1><?php echo esc_html(single_term_title('',false)); ?> farm equipment specifications</h1><p>Model data and parts references organized by manufacturer. Confirm year and serial range.</p></div></div>
<div class="wrap archive-grid"><div class="card-grid">
<?php if(have_posts()){while(have_posts()){the_post();fms_card(get_the_ID());}}else{echo '<p>No verified records have been published for this manufacturer yet.</p>';} ?>
</div><div class="pagination"><?php the_posts_pagination(['mid_size'=>2]); ?></div></div><?php get_footer(); ?>
