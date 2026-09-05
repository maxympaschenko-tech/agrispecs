import type { ReactNode } from 'react';
import Link from 'next/link';
import { getMachine, getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';
import { comparisonPresets } from '@/lib/comparison-presets';
import { getMachineGenerationLabel } from '@/lib/machine-display';
import { getMachineImages } from '@/lib/machine-images-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string; model: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function absoluteUrl(baseUrl: string, value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

function structuredSpecValue(spec: MachineSpec) {
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return null;
  return `${spec.valueNumber}${spec.unit ? ` ${spec.unit}` : ''}`;
}

export default async function TractorModelLayout({ children, params }: LayoutProps) {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
  const isPublished = machine && (machine.dataStatus === 'partial' || machine.dataStatus === 'verified');
  const isPreviousGeneration = machine ? Boolean(getMachineGenerationLabel(machine.modelSlug)) : false;
  const relatedComparisons = isPublished && !isPreviousGeneration
    ? comparisonPresets.filter((preset) =>
        preset.machines.some((target) => target.brand === machine.brand && target.model === machine.model),
      )
    : [];

  const versions = isPublished ? await getMachineVersions(machine.id) : [];
  const selectedVersion = versions.find((version) => version.isCurrent)
    || versions.find((version) => version.specCount > 0)
    || versions[0];
  const specs = isPublished && selectedVersion
    ? await getMachineSpecs(machine.id, selectedVersion.id)
    : [];
  const images = isPublished ? await getMachineImages(machine.id) : [];

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = machine
    ? `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`
    : null;
  const primaryImage = images.find((image) => image.isPrimary) || images[0] || null;
  const exactPrimaryImage = primaryImage?.imageKind === 'exact' ? primaryImage : null;
  const versionYears = selectedVersion?.modelYearStart && selectedVersion?.modelYearEnd
    ? `MY${selectedVersion.modelYearStart}-${selectedVersion.modelYearEnd}`
    : selectedVersion?.modelYearStart
      ? `MY${selectedVersion.modelYearStart}+`
      : null;
  const referenceContext = selectedVersion
    ? [selectedVersion.marketName, versionYears, selectedVersion.configuration, selectedVersion.isCurrent ? 'Current' : null]
        .filter(Boolean)
        .join(' · ')
    : null;
  const additionalProperty = [
    referenceContext
      ? { '@type': 'PropertyValue', name: 'Reference context', value: referenceContext }
      : null,
    ...specs.map((spec) => {
      const value = structuredSpecValue(spec);
      return value
        ? { '@type': 'PropertyValue', name: spec.label, value }
        : null;
    }),
  ].filter(Boolean);

  const structuredData = isPublished && machine && canonicalUrl
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${canonicalUrl}#webpage`,
            url: canonicalUrl,
            name: `${machine.title} specs, parts and maintenance`,
            description: `${machine.title} source-backed specifications, maintenance, compatible parts, attachments and reference data.`,
            isPartOf: {
              '@type': 'WebSite',
              '@id': `${baseUrl}/#website`,
              url: baseUrl,
              name: 'Farm Machine Specs',
            },
            breadcrumb: {
              '@id': `${canonicalUrl}#breadcrumb`,
            },
            mainEntity: {
              '@id': `${canonicalUrl}#product`,
            },
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${canonicalUrl}#breadcrumb`,
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: baseUrl,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Tractors',
                item: `${baseUrl}/tractors`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: machine.brand,
                item: `${baseUrl}/brands/${machine.brandSlug}`,
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: machine.title,
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Product',
            '@id': `${canonicalUrl}#product`,
            url: canonicalUrl,
            name: machine.title,
            model: machine.model,
            category: 'Tractor',
            description: `${machine.title} source-backed tractor specifications and reference data.`,
            brand: {
              '@type': 'Brand',
              name: machine.brand,
            },
            ...(exactPrimaryImage ? { image: [absoluteUrl(baseUrl, exactPrimaryImage.imageUrl)] } : {}),
            ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
          },
        ],
      }
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
      )}
      {children}

      {isPublished && (
        <section className="section">
          <div className="container">
            <span className="eyebrow">Tractor tools</span>
            <h2>More {machine.title} reference tools</h2>
            <p className="section-lead">
              Continue into manufacturer coverage, documented parts, attachment fitment, serial-number checking or our data methodology.
            </p>
            <div className="grid">
              <Link className="card" href={`/brands/${machine.brandSlug}`}>
                <span className="eyebrow">Manufacturer hub</span>
                <h3>Browse {machine.brand} models</h3>
                <p>See other published {machine.brand} tractor records and coverage status.</p>
              </Link>
              <Link className="card" href="/parts">
                <span className="eyebrow">Parts catalog</span>
                <h3>Search part numbers</h3>
                <p>Browse source-backed OEM numbers, replacements, kits and compatibility records.</p>
              </Link>
              <Link className="card" href="/attachments">
                <span className="eyebrow">Attachment fitment</span>
                <h3>Browse compatible attachments</h3>
                <p>Open published loader, backhoe and other attachment fitment references.</p>
              </Link>
              <Link className="card" href="/fitment-checker">
                <span className="eyebrow">Compatibility checker</span>
                <h3>Check a part and serial number</h3>
                <p>Test documented model fitment and serial-number ranges when they are available.</p>
              </Link>
              <Link className="card" href="/methodology">
                <span className="eyebrow">Editorial standards</span>
                <h3>How this data is verified</h3>
                <p>Read the manufacturer-first sourcing, normalization and missing-data policy.</p>
              </Link>
            </div>
          </div>
        </section>
      )}

      {isPublished && relatedComparisons.length > 0 && (
        <section className="section">
          <div className="container">
            <span className="eyebrow">Related comparisons</span>
            <h2>Compare {machine.model} with similar tractors</h2>
            <p className="section-lead">Open source-backed side-by-side comparisons that include this tractor.</p>
            <div className="grid">
              {relatedComparisons.slice(0, 4).map((preset) => (
                <Link className="card" key={preset.slug} href={`/compare/${preset.slug}`}>
                  <span className="eyebrow">Tractor comparison</span>
                  <h3>{preset.title}</h3>
                  <p>{preset.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      {isPublished && (
        <Link
          href={`/compare?m1=${encodeURIComponent(machine.id)}`}
          aria-label={`Compare ${machine.title} with another tractor`}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--brand)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(16,39,25,.22)',
          }}
        >
          Compare this tractor
        </Link>
      )}
    </>
  );
}
