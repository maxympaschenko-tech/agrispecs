<?php get_header(); ?>
<div class="page-heading"><div class="wrap"><span class="kicker">Equipment category</span><h1><?php echo esc_html(single_term_title('',false)); ?> — Equipment specifications</h1><p>Browse machines and verified reference information by type.</p></div></div>
<div class="wrap archive-grid"><div class="card-grid">
<?php if(have_posts()){while(have_posts()){the_post();fms_card(get_the_ID());}}else{echo '<p>No source-verified models have been published in this category yet.</p>';} ?>
</div><div class="pagination"><?php the_posts_pagination(['mid_size'=>2]); ?></div></div><?php get_footer(); ?>
