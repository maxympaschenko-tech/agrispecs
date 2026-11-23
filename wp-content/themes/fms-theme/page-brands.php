<?php get_header(); ?>
<div class="page-heading"><div class="wrap"><h1>Farm equipment brands</h1><p>Browse machine specifications by manufacturer. Select a brand to see available models.</p></div></div>
<div class="wrap archive-grid"><div class="card-grid">
<?php
$brands=get_terms(['taxonomy'=>'fms_brand','hide_empty'=>true,'orderby'=>'name','order'=>'ASC']);
if(!is_wp_error($brands)&&$brands){
    foreach($brands as $brand){
        $url=get_term_link($brand);
        if(is_wp_error($url))continue;
        echo '<article class="data-card"><span class="kicker">Manufacturer</span><a href="'.esc_url($url).'"><h3>'.esc_html($brand->name).'</h3></a><p>'.esc_html(number_format_i18n($brand->count)).' machine / parts records</p><a class="read-more" href="'.esc_url($url).'">Browse models →</a></article>';
    }
}else{
    echo '<p>The manufacturer's directory will appear as the catalog is verified and published.</p>';
}
?></div></div><?php get_footer(); ?>
