<?php
/**
 * Brands directory fallback.
 * Avoids taxonomy term queries until the initial equipment records have
 * been published and the production taxonomy templates are validated.
 */
if (!defined('ABSPATH')) { exit; }
get_header();
?>
<section class="page-heading">
  <div class="wrap">
    <span class="kicker">Manufacturer directory</span>
    <h1>Farm equipment brands</h1>
    <p>Find tractors and other agricultural equipment by manufacturer or exact model.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="card-grid">
      <article class="data-card">
        <span class="kicker">Search the catalog</span>
        <h2>Looking for a particular machine?</h2>
        <p>Search a manufacturer name, model number or maintenance topic.</p>
        <form class="inline-search" method="get" action="<?php echo esc_url(home_url('/')); ?>" role="search">
          <label class="screen-reader-text" for="fms-brand-search">Search equipment by brand or model</label>
          <input id="fms-brand-search" name="s" type="search" placeholder="e.g. John Deere 1025R" required>
          <button class="btn" type="submit">Search</button>
        </form>
      </article>
      <article class="data-card">
        <span class="kicker">Model reference</span>
        <h2>Explore machines</h2>
        <p>See available equipment entries and source-backed technical details.</p>
        <a class="read-more" href="<?php echo esc_url(home_url('/machines/')); ?>">Browse equipment specifications →</a>
      </article>
      <article class="data-card">
        <span class="kicker">Data quality</span>
        <h2>Verified facts first</h2>
        <p>The manufacturer directory will expand as machine records are checked and published. We do not list imaginary specs or compatibility claims.</p>
        <a class="read-more" href="<?php echo esc_url(home_url('/methodology/')); ?>">Read our data methodology →</a>
      </article>
    </div>
  </div>
</section>
<?php get_footer(); ?>
