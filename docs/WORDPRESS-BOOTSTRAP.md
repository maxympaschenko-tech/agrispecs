# Safe first-time WordPress setup

Prerequisites: FMS theme and FMS Equipment Data plugin are installed, site backup exists, and Hostinger Git has deployed the latest main branch to public_html/fms-git-stage.

Preview (read-only):

    cd ~/domains/farmmachinespecs.com/public_html/fms-git-stage
    bash scripts/bootstrap-wordpress.sh --check

Apply:

    bash scripts/bootstrap-wordpress.sh --apply

The script validates the URL and WordPress root, creates only missing pages/categories, and sets site name, tagline and post-name permalinks. Existing pages are never overwritten or deleted. It creates Brands, Compare, Unit Converter, About, Methodology and Editorial Policy pages. Contact and Privacy Policy pages are intentionally left to be configured with the actual contact and tracking/advertising arrangements. Activate the data plugin to render [fms_compare] and [fms_unit_converter].
