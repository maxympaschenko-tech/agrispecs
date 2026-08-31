import type { Metadata } from 'next';
import Link from 'next/link';
import { getNonTractorEquipment, getNonTractorEquipmentTypes } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Specs by Type and Brand',
  description: 'Browse source-backed specifications for agricultural equipment beyond tractors, organized by equipment type, manufacturer and model.',
  alternates: { canonical: '/equipment' },
};

export default async function EquipmentPage() {
  const [equipment, types] = await Promise.all([
    getNonTractorEquipment(),
    getNonTractorEquipmentTypes(),
  ]);
  const published = equipment.filter((machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified');
  const groups = Array.from(
    published.reduce<Map<string, typeof published>>((map, machine) => {
      const list = map.get(machine.equipmentTypeSlug) || [];
      list.push(machine);
      map.set(machine.equipmentTypeSlug, list);
      return map;
    }, new Map()),
  );

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Farm equipment beyond tractors</h1>
        <p className="section-lead">Source-backed model pages for transporters and other agricultural machine types. Each machine stays in its manufacturer-defined equipment category instead of being forced into the tractor catalog.</p>

        <div className="parts-stats">
          <div><strong>{published.length.toLocaleString('en-US')}</strong><span>Published equipment models</span></div>
          <div><strong>{types.length.toLocaleString('en-US')}</strong><span>Equipment types</span></div>
          <div><strong>{new Set(published.map((machine) => machine.brandSlug)).size.toLocaleString('en-US')}</strong><span>Manufacturers represented</span></div>
        </div>

        {groups.map(([typeSlug, machines]) => {
          const typeName = machines[0]?.equipmentType || typeSlug;
          return (
            <section className="catalog-group" id={`type-${typeSlug}`} key={typeSlug}>
              <span className="eyebrow">Equipment type</span>
              <h2>{typeName}</h2>
              <p className="section-note">Current published {typeName.toLowerCase()} records with source-backed model specifications.</p>
              <div className="grid">
                {machines.map((machine) => (
                  <div className="card" key={machine.id}>
                    <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>{machine.equipmentType} specifications and current market reference data.</p>
                    <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View model</Link>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {published.length === 0 && (
          <div className="notice">Additional agricultural equipment categories are being prepared from manufacturer sources.</div>
        )}
      </div>
    </main>
  );
}
