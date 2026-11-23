<?php
/**
 * Useful topical landing pages: unlike thin auto archives, each topic answers
 * the visitor's intent and includes relevant source-backed reference links.
 */
if (!defined('ABSPATH')) { exit; }
get_header();
$term = get_queried_object();
$slug = $term instanceof WP_Term ? $term->slug : '';
$topics = [
    'maintenance' => [
        'eyebrow' => 'Service & maintenance',
        'title' => 'Tractor Maintenance, Fluids & Service Intervals',
        'intro' => 'Find manufacturer-based service references, capacities, filter kit numbers and checklists. Confirm the exact model and serial number before purchasing parts or performing service.',
        'bullets' => [
            'Engine and transmission fluid quantities are reference capacities, not guaranteed drain-and-refill amounts.',
            'Filter kits may change at a serial-number boundary, even within one model.',
            'Hour-meter intervals and annual service requirements must be checked together in the operator manual.'
        ],
    ],
    'troubleshooting' => [
        'eyebrow' => 'Problems & safe checks',
        'title' => 'Tractor Troubleshooting: Symptoms, Causes & First Checks',
        'intro' => 'Start with the actual symptom: no-crank, crank-no-start, overheating, hydraulic behavior or an engine warning. These guides help you identify what information to collect before replacing parts.',
        'bullets' => [
            'Distinguish no-crank, slow-crank and normal-crank/no-start problems before ordering parts.',
            'Never bypass safety interlocks or touch high-pressure fuel or hydraulic leaks.',
            'Use the serial-specific service manual and qualified service for safety-critical diagnosis.',
        ],
    ],
    'comparisons' => [
        'eyebrow' => 'Buying decisions',
        'title' => 'Tractor Comparisons: Power, Weight & Hitch Ratings',
        'intro' => 'Read comparisons that keep engine and PTO horsepower separate and explain when published lift figures are not directly comparable.',
        'bullets' => [
            'Identify transmission, year and equipment package rather than comparing model names alone.',
            'Compare hitch capacities at matching load positions, not just the largest advertised number.',
            'Check tractor and implement requirements together before deciding what to buy.',
        ],
    ],
    'buying-guides' => [
        'eyebrow' => 'Before you buy',
        'title' => 'Farm Tractor Buying Guides for US Owners',
        'intro' => 'Practical checks for comparing real tractor configurations, choosing compatible implements and evaluating the ownership cost of compact equipment.',
        'bullets' => [
            'Match your work, attachments and terrain to the manufacturer ratings.',
            'Consider maintenance history, parts access, dealer support and actual transport weight.',
            'Treat advertised loader lift as configuration-specific, not a measure of total tractor capability.',
        ],
    ],
    'parts-compatibility' => [
        'eyebrow' => 'OEM reference',
        'title' => 'Farm Equipment Parts & Compatibility References',
        'intro' => 'Explore manufacturer part numbers, filter-kit serial restrictions and the steps needed to confirm current replacement parts.',
        'bullets' => [
            'A listed “generally compatible” part is not a guaranteed fit for a specific tractor.',
            'Serial boundaries and part-number supersessions matter more than a product photograph.',
            'Confirm all components against the original equipment maker before installation.',
        ],
    ],
    'guides' => [
        'eyebrow' => 'Owner resources',
        'title' => 'Farm Equipment Guides, Repairs & Comparisons',
        'intro' => 'Independent technical references organized around real work, published model ratings and practical maintenance decisions.',
        'bullets' => [
            'Find the correct manufacturer documentation for your exact machine.',
            'Compare source-backed model records and identify unsupported figures.',
            'Use practical checklists without mistaking them for factory service procedures.',
        ],
    ],
];
$topic = $topics[$slug] ?? null;
$title = $topic ? $topic['title'] : single_cat_title('', false);
$intro = $topic ? $topic['intro'] : term_description($term);
?>
<section class="page-heading">
 <div class="wrap">
    <?php if ($topic): ?><span class="kicker"><?php echo esc_html($topic['eyebrow']); ?></span><?php endif; ?>
    <h1><?php echo esc_html($title); ?></h1>
    <?php if ($intro): ?><p><?php echo esc_html(wp_strip_all_tags($intro)); ?></p><?php endif; ?>
 </div>
</section>
<div class="wrap fms-topic-layout">
 <?php if ($topic): ?>
 <section class="fms-topic-intro" aria-label="What to know">
   <h2>What to check first</h2>
   <ul><?php foreach ($topic['bullets'] as $item): ?><li><?php echo esc_html($item); ?></li><?php endforeach; ?></ul>
   <div class="fms-topic-tools">
     <a href="<?php echo esc_url(home_url('/machines/')); ?>">Browse model specifications →</a>
     <a href="<?php echo esc_url(home_url('/compare/')); ?>">Compare tractor ratings →</a>
     <a href="<?php echo esc_url(home_url('/parts/')); ?>">Browse parts references →</a>
   </div>
 </section>
 <?php endif; ?>
 <section class="fms-topic-list" aria-label="Published articles">
  <div class="section-head"><h2>Published <?php echo esc_html($term instanceof WP_Term ? $term->name : ''); ?> articles</h2></div>
  <?php if (have_posts()): ?>
  <div class="card-grid">
    <?php while (have_posts()) { the_post(); fms_card(get_the_ID()); } ?>
  </div>
  <div class="pagination"><?php the_posts_pagination(['mid_size' => 2]); ?></div>
  <?php else: ?>
    <p>No articles are currently published in this topic. Explore the <a href="<?php echo esc_url(home_url('/machines/')); ?>">machine catalog</a> or <a href="<?php echo esc_url(home_url('/category/guides/')); ?>">general guides</a>.</p>
  <?php endif; ?>
 </section>
</div>
<?php get_footer(); ?>
