# Automated editorial import and verification

## Current workflow

Hostinger Git Auto-deploy tracks the public GitHub `main` branch and checks out the repository to `public_html/fms-git-stage/`. A host Cron job runs `/bin/bash /home/u398283054/domains/farmmachinespecs.com/public_html/fms-git-stage/scripts/sync-wordpress.sh` every 15 minutes.

The script:
1. Confirms the WordPress installation and checkout directory.
2. Runs PHP syntax checks on the custom theme, plugin and scripts.
3. Synchronizes ONLY the custom theme `fms-theme` and the companion plugin `fms-equipment-data`.
4. Calls `wp eval-file .../scripts/import-reviewed-content.php` to import the reviewed bundle.
5. Emits concise success/failure output for Hostinger Cron logs.

All publication data is version-controlled in `data/reviewed-content.json`.

## Publication safeguards

- The importer checks the exact `https://farmmachinespecs.com` domain and refuses to operate if the data plugin or its taxonomy is missing.
- Only explicit `status: publish` records publish automatically. Other entries default to draft.
- A post with an existing type+slug is NEVER overwritten, even if someone edited it directly in WordPress.
- Bundle SHA-256 is stored as a WordPress option, so unchanged bundles do not re-import on every Cron run.
- Machines record manufacturer, equipment type, source checked date, and configuration-specific specifications.
- Articles include accessible inline source links.
- Data must be reviewed and sourced before being committed to `main`. No automated speculative claim creation.
- No images are hotlinked. Local, licensed photographs can be added later.

## Validate on hosting

After an auto-deploy and Cron execution, open `https://farmmachinespecs.com/machines/kubota-bx2380/` and `https://farmmachinespecs.com/brands/` and inspect Hostinger Cron results.

If a new bundle is not imported, run from SSH:

```bash
cd ~/domains/farmmachinespecs.com/public_html/fms-git-stage
bash scripts/sync-wordpress.sh
```

If the command reports errors, inspect them; never bypass PHP validation or force-publish unverified values. To confirm the import status, run:

```bash
wp --path=~/domains/farmmachinespecs.com/public_html post list --post_type=fms_machine --fields=ID,post_title,post_status --format=table
wp --path=~/domains/farmmachinespecs.com/public_html post list --post_type=post --fields=ID,post_title,post_status --format=table
```

Do not run the old `bootstrap-wordpress.sh --apply` again; core pages and categories were already created.
