import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Farm Equipment',
  description: 'Compare farm equipment specifications side by side.',
};

export default function ComparePage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Comparison tool</span>
        <h1>Compare farm equipment</h1>
        <p className="section-lead">Side-by-side comparisons will be enabled after verified specification records are loaded into the database.</p>
        <div className="card">
          <h3>Comparison engine foundation</h3>
          <p>The data model is normalized so the same specification definitions can be compared across manufacturers and machine models.</p>
        </div>
      </div>
    </main>
  );
}
