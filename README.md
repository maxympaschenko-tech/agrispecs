# Farm Machine Specs — WordPress Rebuild

Production domain: https://farmmachinespecs.com/
Audience: English-speaking US tractor owners, farmers, acreage owners, used-equipment buyers and DIY mechanics.

This repository contains **only the custom WordPress theme and companion data plugin**. WordPress core and its database are installed and maintained on Hostinger, not committed here. This replaces the previous Next.js application.

## Install on Hostinger

1. Create a fresh WordPress site on farmmachinespecs.com (US/Boston hosting). Use HTTPS and non-www as canonical.
2. Upload the \`wp-content/themes/fms-theme\` directory into the site's themes directory, then activate **Farm Machine Specs**.
3. Upload \`wp-content/plugins/fms-equipment-data\` into the plugins directory, then activate **FMS Equipment Data**.
4. In Settings → Permalinks choose **Post name**, and save.
5. Create an empty **Brands** page (slug `brands`) for the manufacturer directory, then pages **Compare** (slug \`compare\`, shortcode \`[fms_compare]\`), **Unit Converter** (slug \`unit-converter\`, shortcode \`[fms_unit_converter]\`), **Methodology**, **Editorial Policy**, **About**, **Contact**, **Privacy Policy**. Publish real text before indexing.
6. In Settings → Reading select a static front page if desired; the theme has its own homepage template.
7. Set site title "Farm Machine Specs" and tagline "Farm Equipment Data, Repairs & Buying Tools".
8. Add a trusted SEO plugin and validate XML sitemap, canonical, breadcrumbs and schema without duplicates.
9. Connect Google Search Console and GA4; check 404s before releasing the new site.

### Content architecture
- Machines: \`/machines/{model}/\` (CPT)
- Brands: \`/brands/{brand}/\` (machine taxonomy)
- Equipment types: \`/equipment-types/{type}/\` (machine taxonomy)
- Parts: \`/parts/{part}/\` (CPT; **no unverified fitment assertions**)
- Repair / maintenance / buyer guides: normal WP posts + categories
- Comparison tool: \`/compare/\` (page shortcode)
- Unit converter: \`/unit-converter/\` (page shortcode)

### Provenance requirement
Each published model's specs should come from manufacturer manuals, official brochures or other traceable references. Record source URL and verification date. "Not available" is better than a guessed number. Do not manufacture owner reviews, prices, serial-number ranges or part interchangeability.

### SEO migration caution
The old Next.js site exposed model URLs of the form \`/tractors/{brand}/{model}/\`. Those legacy URLs will require **model-by-model 301 redirects** to matching verified new WP pages before significant reindexing. Do not blanket-redirect the entire old directory to the homepage or pretend non-existent content has moved.

### Deployment
This repo is a versioned code source, **not** an automatic deployment to Hostinger WordPress. Upload/sync the theme and plugin directories to WordPress. Never deploy the repo root over a WordPress installation. Do not commit \`wp-config.php\`, credentials, media, or the database.

The prior Next.js source remains available in Git commit history before the reset, but no former application files remain in main.
