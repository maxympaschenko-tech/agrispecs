# Hostinger deployment without WPVibe or GitHub Actions

## Deployment topology

The Hostinger UI in November 2026 restricts the deployment folder to a path under public_html. **Never deploy this repository to public_html itself.**

Choose GitHub repo `maxympaschenko-tech/agrispecs`, branch `main` and subfolder `fms-git-stage`. The repository is then staged under `public_html/fms-git-stage/`.

The included root `.htaccess` denies all HTTP requests to this staging tree. **Verify** that visiting `https://farmmachinespecs.com/fms-git-stage/README.md` returns HTTP 403 (or another blocked status). If it returns readable README content, staging is NOT protected. Stop and deny public access in hosting settings or migrate the checkout outside webroot with SSH before continuing.

## Synchronize custom code to WordPress

After confirming staging is protected, use Hostinger SSH or File Manager Terminal to run the script once by absolute path:

```bash
bash /home/u123456789/domains/farmmachinespecs.com/public_html/fms-git-stage/scripts/sync-wordpress.sh
```

Replace `u123456789` with the real Hostinger hosting account path. Do NOT run the example literally without checking the real path in SSH. The script checks that `wp-config.php` and `wp-includes` exist in the parent `public_html`, and only updates:

- `public_html/wp-content/themes/fms-theme/`
- `public_html/wp-content/plugins/fms-equipment-data/`

It does not change WordPress core, its database or uploads. The script updates only these named directories; do not place site-specific manual edits there, since they may be overwritten.

After successful dry testing, schedule the exact same `bash /absolute/path/.../scripts/sync-wordpress.sh` with a Hostinger cron every 5–15 minutes. Hostinger's Git integration auto-deploys the new main revision into the staging directory and cron copies the custom code to the live WordPress tree. No GitHub Actions and no WPVibe needed.

## WordPress activation

Log in to WordPress admin to activate the new FMS theme and FMS Equipment Data plugin. Save permalinks, publish the required pages, then check desktop/mobile site, SEO and error logs.

## Operational warnings

- Verify the hosting backup before initial activation and theme swap.
- Don't auto-publish unverified technical specs or part fitment.
- The repo is public; never add credentials or application passwords.
- Keep staging HTTP-blocked, check after deployment and check cron output for errors.
- Git deploy alone does not make the staged files active in WordPress; the sync script and WordPress activation are separate.
