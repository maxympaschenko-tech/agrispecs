# Production DNS / indexing QA — 2026-11-23

## WWW currently serves Hostinger's parking page

The preferred WordPress site is **https://farmmachinespecs.com/** (without www). A fresh public check of **https://www.farmmachinespecs.com/** returned a generic "Parked Domain name on Hostinger DNS system" landing page instead of the WordPress site. This is **not** repairable from this theme repository; it needs DNS/Hostinger domain binding and a redirect.

Before changing any DNS, inspect which nameservers are authoritative. In Hostinger hPanel > Domains/DNS Zone, confirm:
1. Non-www A/AAAA and hosting target currently serving the working WordPress site.
2. Whether the **www** CNAME or A record exists and points to the same intended website / allowed canonical target. Do not add a second conflicting CNAME or modify unrelated domains.
3. Whether both hosts are added to the same Hostinger website, and whether SSL covers both hosts.
4. Configure a permanent **301 redirect from www.farmmachinespecs.com to farmmachinespecs.com** while preserving the request path. Set one canonical non-www URL in WordPress and confirm sitemap and search-console properties.
5. Retest https://www.farmmachinespecs.com/machines/ and https://www.farmmachinespecs.com/ after DNS and certificate propagation. They must redirect to the corresponding non-www URLs, never show parking or duplicate indexable content.

## Publishing

The Hostinger checkout of `main` is staged at `public_html/fms-git-stage/`, HTTP blocked; Cron `sync-wordpress.sh` performs PHP lint and `validate-reviewed-content.php`, synchronizes theme and custom plugin, then runs the idempotent reviewed content import.

Audit after each new bundle:
- Home, /machines/, /parts/, /compare/, /brands/ load.
- Each new slug appears with its exact source and configuration notes; absent or failed imports must not be called published.
- Compare and search filters work at mobile widths.
- WP XML sitemap lists new content and taxonomy pages, and robots do not block public records.
- Cron logs do not contain PHP validation errors, WordPress fatals or import exceptions.
- Avoid linking directly to hotlinked external equipment photos without publication rights.

Current content data file is `data/reviewed-content.json`; new slugs are created only if absent, without overwriting editorial changes in WordPress.
