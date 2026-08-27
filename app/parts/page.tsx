import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Equipment Parts Reference',
  description: 'OEM part numbers, replacements, cross references and farm equipment compatibility data.',
};

export default function PartsPage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Parts catalog</span>
        <h1>Farm equipment parts</h1>
        <p className="section-lead">This section will index OEM part numbers, replacement parts, supersessions, cross references and compatible equipment.</p>
        <div className="grid">
          {['Filters', 'Belts', 'Electrical', 'Cooling', 'Hydraulics', 'Drivetrain'].map((name) => (
            <div className="card" key={name}>
              <h3>{name}</h3>
              <p>Category structure ready for verified part records.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
