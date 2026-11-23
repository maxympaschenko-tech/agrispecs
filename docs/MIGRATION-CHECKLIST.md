# Old Next.js URL migration to WordPress

Do not remove existing indexed URLs without a mapped replacement strategy.

## Old site
- /tractors/{brand}/{model}/
- /tractors/
- /brands/ and /brands/{brand}/
- /parts/
- /compare/
- Additional legacy guide/comparison routes may be found in the pre-reset Git history.

## New site
- /machines/{model}/
- /brands/{brand}/ (terms)
- /parts/{part}/
- /compare/
- /category/troubleshooting/
- /category/maintenance/

## Process
1. Export all historically indexed legacy URLs from Search Console, old XML sitemaps, server logs and old Git route patterns.
2. Re-create high-value content with the original model/configuration and verifiable manufacturer-source references.
3. Set exact **301 old URL -> matching new URL** only when a true equivalent exists; if not, retain helpful 404/410 rather than redirect to the homepage.
4. Verify chains and loops; no 302, no www/non-www conflict, HTTPS only.
5. Test mobile, structured data, XML sitemap, robots, title and canonical before requesting reindexing.
6. Review post-migration 404 reports weekly.

### Important
The previous Next.js database and the WordPress MySQL database are not the same thing. Installing this repository's plugin does **not** migrate the former 1,417-model catalog or its fitment records. First validate and export recoverable source data before any import. Retain configuration-specific provenance and reject unverified fitment.
