# AgriSpecs

AgriSpecs is an English-language farm equipment specifications, maintenance and parts reference built for US search traffic.

## Stack

- Next.js 16.3.3
- React 19.2
- Node.js 22+
- MariaDB / MySQL
- mysql2
- Hostinger Business Web Hosting

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Production build

```bash
npm install
npm run build
npm start
```

## Environment variables

Set these in Hostinger hPanel for the Node.js app:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.com
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

The current frontend can run before the database is connected because initial seed entities live in `lib/catalog.ts`.

## Database

The normalized MariaDB schema is in `db/schema.sql` and includes:

- manufacturers
- equipment types
- machine series
- machines
- specification definitions
- machine specifications
- part categories
- parts
- machine-to-part fitment
- part cross references / replacements / supersessions
- sources and source records

Every imported technical fact is designed to retain source provenance and confidence.

## SEO routes

```text
/tractors/
/tractors/{brand}/{model}/
/brands/
/brands/{brand}/
/parts/
/compare/
/search?q=...
/sitemap.xml
/robots.txt
```

Search result pages are `noindex`; canonical model pages are indexable.

## Hostinger deployment

Create a Node.js Web App in hPanel and connect this GitHub repository. Hostinger should detect Next.js automatically. Use Node.js 22 and the standard build command `npm run build`. Set the environment variables before connecting the production database.

## Data quality rule

Do not publish unverified numerical specifications as facts. Seed records may identify real machine models, but technical values should move to publishable status only after source verification.
